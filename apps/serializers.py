import re
from django.contrib.auth import get_user_model
from rest_framework.serializers import CharField, Serializer, ValidationError, ModelSerializer , SerializerMethodField
from apps.models import Guests , BudgetItem , Task , VendorImage , Vendor, Review
from apps.plan import PLAN_LABELS
User = get_user_model()



class RegisterSerializers(Serializer):
    phone_number = CharField(max_length=30)
    password = CharField(min_length=6, max_length=20, write_only=True)
    confirm_password = CharField(min_length=6, max_length=20, write_only=True)

    def validate_phone_number(self, value):
        digits = re.sub(r'\D', '', value)
        if digits.startswith('998'):
            digits = digits[3:]
        if len(digits) != 9:
            raise ValidationError("Telefon raqamni to'liq kiriting")

        phone = f'+998{digits}'
        if User.objects.filter(phone_number=phone).exists():
            raise ValidationError("Bu telefon raqam allaqachon ro'yxatdan o'tgan")
        return phone

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise ValidationError({'confirm_password': 'Parollar bir xil emas'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            phone_number=validated_data['phone_number'],
            password=validated_data['password'],
        )


class GuestSerializers(ModelSerializer):
    class Meta:
        model = Guests
        fields = 'id', 'full_name', 'phone_number', 'side', 'status', 'group'


class UserSerializers(ModelSerializer):
    plan = CharField(source='active_plan', read_only=True)
    plan_label = SerializerMethodField()

    class Meta:
        model = User
        fields = ['phone_number', 'first_name', 'language', 'wedding_day', 'telegram_id',
                  'plan', 'plan_label', 'plan_expires_at']

        read_only_fields = ['phone_number', 'plan_expires_at']

    def get_plan_label(self, obj):
        return PLAN_LABELS[obj.active_plan]

class  BudgetItemSerializers(ModelSerializer):
    class Meta:
        model = BudgetItem
        fields = ['id', 'category', 'planned_amount', 'spent_amount', 'note']


class TaskModelSerializers(ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'due_date', 'priority', 'is_done']


class VendorImageSerializer(ModelSerializer):
    image = SerializerMethodField()

    class Meta:
        model = VendorImage
        fields = ['id', 'image']

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class VendorSerializer(ModelSerializer):
    images = VendorImageSerializer(many=True, read_only=True)
    category_label = CharField(source='get_category_display', read_only=True)
    cover_image = SerializerMethodField()
    review_count = SerializerMethodField()
    has_reviewed = SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            'id', 'name', 'category', 'category_label', 'description',
            'city', 'address', 'phone_number', 'instagram_url',
            'price_min', 'price_max', 'rating', 'cover_image', 'images',
            'review_count', 'has_reviewed',
        ]

    def get_cover_image(self, obj):
        return obj.cover_image.url if obj.cover_image else None

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_has_reviewed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.reviews.filter(user=request.user).exists()


class ReviewSerializer(ModelSerializer):
    user_name = SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'stars', 'comment', 'created_at', 'user_name']
        read_only_fields = ['created_at']

    def get_user_name(self, obj):
        return obj.user.first_name or 'Foydalanuvchi'


class ChangePasswordSerializer(Serializer):
    old_password = CharField(write_only=True)
    new_password = CharField(min_length=8, max_length=20, write_only=True)
    confirm_password = CharField(min_length=8, max_length=20, write_only=True)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['old_password']):
            raise ValidationError({'old_password': "Joriy parol noto'g'ri"})
        if attrs['new_password'] != attrs['confirm_password']:
            raise ValidationError({'confirm_password': 'Yangi parollar bir xil emas'})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user