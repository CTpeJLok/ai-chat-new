from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractUser
from django.db import models

if TYPE_CHECKING:
    from apps.spaces.models import SpaceMember


class User(AbstractUser):
    spaces: models.QuerySet["SpaceMember"]
