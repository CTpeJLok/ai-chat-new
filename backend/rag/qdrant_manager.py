from functools import lru_cache

from django.core.files.storage import default_storage
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    SparseIndexParams,
    SparseVectorParams,
    VectorParams,
)

COLLECTION_NAME = "documents"

dense_embedding = OpenAIEmbeddings(model="text-embedding-3-small")
sparse_embedding = FastEmbedSparse(language="russian")


@lru_cache(maxsize=1)
def get_client():
    client = QdrantClient(path="qdrant")
    if not client.collection_exists(COLLECTION_NAME):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                "dense": VectorParams(
                    size=1536,
                    distance=Distance.COSINE,
                ),
            },
            sparse_vectors_config={
                "sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False)),
            },
        )
    return client


@lru_cache(maxsize=1)
def get_vector_store():
    return QdrantVectorStore(
        client=get_client(),
        collection_name=COLLECTION_NAME,
        embedding=dense_embedding,
        sparse_embedding=sparse_embedding,
        retrieval_mode=RetrievalMode.HYBRID,
        vector_name="dense",
        sparse_vector_name="sparse",
    )


# ── Работа с документами ──────────────────────────────────────────────────────


def _extract_text(file_instance) -> str:
    file_name = file_instance.name.lower()

    with default_storage.open(file_instance.file.name, "rb") as f:
        raw = f.read()

    if file_name.endswith(".pdf"):
        return _extract_pdf(raw)

    # всё остальное — текст
    return raw.decode("utf-8", errors="replace")


def _extract_pdf(raw: bytes) -> str:
    import io

    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(raw))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def add_document(file_instance, metadata: dict | None = None) -> list[str]:
    """
    Разбивает текст на чанки и записывает в Qdrant.

    file_id и space_id сохраняются в payload каждого чанка и доступны
    для фильтрации при поиске.

    Args:
        file_instance: Экземпляр файла.
        file_id:  Идентификатор файла.
        space_id: Идентификатор пространства.
        metadata: Дополнительные метаданные (source, author, …).

    Returns:
        Список ID добавленных точек в Qdrant.
    """
    text = _extract_text(file_instance)
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=512,
        chunk_overlap=64,
        separators=["\n\n", "\n", ".", " ", ""],
    ).split_text(text)

    payload = {**(metadata or {}), "file_id": file_instance.pk, "space_id": file_instance.space_id}
    docs = [Document(page_content=chunk, metadata=payload) for chunk in chunks]

    ids = get_vector_store().add_documents(docs)
    print(f"[add_document] file_id={file_instance.pk!r} space_id={file_instance.space_id!r} → {len(ids)} чанков")
    return ids


def delete_document(file_id: int) -> None:
    """Удаляет все чанки, принадлежащие файлу."""
    try:
        get_vector_store().delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(must=[FieldCondition(key="metadata.file_id", match=MatchValue(value=file_id))]),
        )
    except:
        pass

    print(f"[delete_document] Удалены чанки file_id={file_id!r}")


# ── Построение фильтров ───────────────────────────────────────────────────────
#
# LangChain сохраняет метаданные документа в payload под ключом "metadata",
# поэтому путь к полю: "metadata.file_id", "metadata.space_id".
#
# Варианты фильтрации:
#   - один file_id        → MatchValue
#   - список file_id      → MatchAny
#   - один space_id       → MatchValue
#   - file_id + space_id  → must=[условие1, условие2]


def _build_filter(
    file_id: str | list[str] | None = None,
    space_id: str | list[str] | None = None,
) -> Filter | None:
    """
    Строит qdrant Filter из переданных идентификаторов.

    Поддерживает:
        file_id="abc"                  → один файл
        file_id=["abc", "def"]         → несколько файлов
        space_id="space-1"             → всё пространство
        space_id=["space-1","space-2"] → несколько пространств
        file_id=..., space_id=...      → AND между условиями
    """
    conditions = []

    if file_id is not None:
        key = "metadata.file_id"
        if isinstance(file_id, list):
            conditions.append(FieldCondition(key=key, match=MatchAny(any=file_id)))
        else:
            conditions.append(FieldCondition(key=key, match=MatchValue(value=file_id)))

    if space_id is not None:
        key = "metadata.space_id"
        if isinstance(space_id, list):
            conditions.append(FieldCondition(key=key, match=MatchAny(any=space_id)))
        else:
            conditions.append(FieldCondition(key=key, match=MatchValue(value=space_id)))

    if not conditions:
        return None
    return Filter(must=conditions)


# ── Поиск ─────────────────────────────────────────────────────────────────────


def search(
    query: str,
    k: int = 5,
    file_id: str | list[str] | None = None,
    space_id: str | list[str] | None = None,
    score_threshold: float | None = None,
) -> list[tuple[Document, float]]:
    """
    Гибридный поиск с опциональной фильтрацией по file_id / space_id.

    Args:
        query:           Поисковый запрос.
        k:               Кол-во результатов.
        file_id:         Один ID или список — ищет только в этих файлах.
        space_id:        Один ID или список — ищет только в этих пространствах.
        score_threshold: Минимальный порог релевантности.

    Returns:
        Список (Document, score) по убыванию релевантности.

    Examples:
        search("запрос")                              # без фильтров
        search("запрос", file_id="file-42")           # один файл
        search("запрос", file_id=["f1", "f2"])        # несколько файлов
        search("запрос", space_id="space-1")          # всё пространство
        search("запрос", file_id="f1", space_id="s1") # файл внутри пространства
    """
    qdrant_filter = _build_filter(file_id=file_id, space_id=space_id)

    kwargs: dict = {"k": k}
    if qdrant_filter is not None:
        kwargs["filter"] = qdrant_filter
    if score_threshold is not None:
        kwargs["score_threshold"] = score_threshold

    return get_vector_store().similarity_search_with_score(query, **kwargs)


def search_as_retriever(
    query: str,
    k: int = 5,
    file_id: str | list[str] | None = None,
    space_id: str | list[str] | None = None,
) -> list[Document]:
    """Упрощённая обёртка — возвращает только документы."""
    qdrant_filter = _build_filter(file_id=file_id, space_id=space_id)

    search_kwargs: dict = {"k": k}
    if qdrant_filter is not None:
        search_kwargs["filter"] = qdrant_filter

    return get_vector_store().as_retriever(search_kwargs=search_kwargs).invoke(query)
