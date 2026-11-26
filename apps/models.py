from django.contrib.auth.models import AbstractUser
from django.db.models.deletion import CASCADE
from django.db.models.enums import TextChoices
from django.db.models import CharField, BigIntegerField, Avg, DateTimeField, UniqueConstraint, DateField, BooleanField, Model , TextField, DecimalField, ImageField, URLField, PositiveSmallIntegerField
from django.db.models.fields.related import ForeignKey
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.managers import UserManager
from django.db.models.signals import post_delete
from django.dispatch import receiver


# Create your models here.

class User(AbstractUser):
    class LanguageType(TextChoices):
        UZ_LATIN = "uz_latin", "O'zbek (lotin)"
        UZ_CYRILLIC = "uz_cyrillic", "O'zbek (Krill)"
        RU = "ru", "Rus"


    class PlanType(TextChoices):
        FREE = 'free', 'Bepul'
        PREMIUM = 'premium', 'Premium'
        VIP = 'vip', 'VIP'

    plan = CharField(max_length=10, choices=PlanType.choices, default=PlanType.FREE)
    plan_expires_at = DateTimeField(null=True, blank=True)

    @property
    def active_plan(self):
        # Muddati o'tgan tarif avtomatik bepulga qaytadi
        if self.plan != self.PlanType.FREE and self.plan_expires_at and self.plan_expires_at < timezone.now():
            return self.PlanType.FREE.value
        return self.plan


    username = None
    phone_number = CharField(max_length=255, unique=True)
    telegram_id = BigIntegerField(null=True, blank=True, unique=True)
    language = CharField(max_length=15, choices=LanguageType, default=LanguageType.UZ_LATIN)
    wedding_day = DateField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.phone_number

class Guests(Model):

    class SideType(TextChoices):
        BRIDGE = 'bridge', 'Kelin tomoni'
        GROOM = 'groom', 'Kuyov tomoni'

    class StatusType(TextChoices):
        INVITED = 'invited' , 'Taklif qilindi'
        CONFIRMED = 'confirmed' , 'Tasdiqlandi'
        DECLINED  = 'declined', 'Kelmaydi'

    class GroupType(TextChoices):
        FAMILY = 'family', 'Oila'
        FRIENDS = 'friends', 'Do`stlar'
        COLLEAGUES = 'colleagues', 'Hamkasblar'

    user = ForeignKey('apps.User', on_delete=CASCADE, related_name='guests')
    full_name = CharField(max_length=255)
    phone_number = CharField(max_length=20, blank=True)
    side = CharField(max_length=20, choices=SideType.choices)
    status = CharField(max_length=20, choices=StatusType.choices)
    group = CharField(max_length=20, choices=GroupType.choices)

    def __str__(self):
        return self.full_name

class BudgetItem(Model):
    user = ForeignKey('apps.User', on_delete=CASCADE, related_name='budget_items')
    category = CharField(max_length=255)
    planned_amount = BigIntegerField(default=0)
    spent_amount = BigIntegerField(default=0)
    note = CharField(max_length=255, blank=True)

    def __str__(self):
        return self.category

class Task(Model):
    class PriorityType(TextChoices):
        HIGH = 'high', 'Yuqori'
        MEDIUM = 'medium', 'O`rta'
        LOW = 'low', 'Past'

    user = ForeignKey('apps.User', on_delete=CASCADE, related_name='tasks')
    title = CharField(max_length=255)
    description = TextField(blank=True)
    due_date = DateField(null=True, blank=True)
    priority = CharField(max_length=10, choices=PriorityType.choices, default=PriorityType.MEDIUM)
    is_done = BooleanField(default=False)

    class Meta:
        ordering = ['is_done', 'due_date']

    def __str__(self):
        return self.title

class Vendor(Model):
    class CategoryType(TextChoices):
        VENUE = 'venue', 'To`yxona'
        PHOTO = 'photo', 'Fotograf va Video'
        DECOR = 'decor', 'Dekarator'
        BRIDAL = 'bridal', 'Kelinlik saloni'
        MUSIC = 'music', 'Hofizlar'
        CATERING = 'catering', 'Oshxona xizmati'

    name = CharField(max_length=255)
    category = CharField(max_length=20, choices=CategoryType.choices)
    description = TextField(blank=True)
    city = CharField(max_length=100, blank=True)
    address = CharField(max_length=255, blank=True)
    phone_number = CharField(max_length=20, blank=True)
    instagram_url = URLField(blank=True)
    price_min = BigIntegerField(null=True, blank=True)
    price_max = BigIntegerField(null=True, blank=True)
    rating = DecimalField(max_digits=2, decimal_places=1, default=0)
    cover_image = ImageField(upload_to='vendors/covers/', blank=True, null=True)
    is_active = BooleanField(default=True)

    class Meta:
        ordering = ['-rating', 'name']

    def __str__(self):
        return self.name

    def recalculate_rating(self):
        avg = self.reviews.aggregate(a=Avg('stars'))['a']
        self.rating = Decimal(str(round(avg, 1))) if avg else Decimal('0')
        self.save(update_fields=['rating'])


class VendorImage(Model):
    vendor = ForeignKey('apps.Vendor', on_delete=CASCADE, related_name='images')
    image = ImageField(upload_to='vendors/gallery/')

    def __str__(self):
        return f'{self.vendor.name} — rasm'


class Review(Model):
    vendor = ForeignKey('apps.Vendor', on_delete=CASCADE, related_name='reviews')
    user = ForeignKey('apps.User', on_delete=CASCADE, related_name='reviews')
    stars = PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = TextField(blank=True, max_length=500)
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            UniqueConstraint(fields=['vendor', 'user'], name='unique_vendor_review'),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.vendor.recalculate_rating()


    def __str__(self):
        return f'{self.vendor.name}: {self.stars} ★'


@receiver(post_delete, sender=Review)
def update_vendor_rating_on_delete(sender, instance, **kwargs):
    # Vendor o'zi o'chirilayotgan bo'lsa (cascade), reytingni hisoblamaymiz
    vendor = Vendor.objects.filter(pk=instance.vendor_id).first()
    if vendor:
        vendor.recalculate_rating()









