import re
from django.contrib.auth import get_user_model
from rest_framework.serializers import CharField, Serializer, ValidationError, ModelSerializer
from apps.models import Guests , BudgetItem , Task , VendorImage , Vendor
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
    class Meta:
        model = User
        fields = [
            'phone_number', 'first_name', 'last_name', 'language', 'wedding_day',
            'telegram_id', 'premium_status', 'date_joined', 'is_staff',
        ]
        # premium faqat to'lovdan keyin backend tomonidan yoqiladi (2-bosqich)
        read_only_fields = ['phone_number', 'premium_status', 'date_joined', 'is_staff']
        extra_kwargs = {'telegram_id': {'allow_null': True, 'required': False}}


class  BudgetItemSerializers(ModelSerializer):
    class Meta:
        model = BudgetItem
        fields = ['id', 'category', 'planned_amount', 'spent_amount', 'note']


class TaskModelSerializers(ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'due_date', 'priority', 'is_done']


class VendorImageSerializer(ModelSerializer):
    class Meta:
        model = VendorImage
        fields = ['id', 'image']


class VendorSerializer(ModelSerializer):
    images = VendorImageSerializer(many=True, read_only=True)
    category_label = CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Vendor
        fields = [
            'id', 'name', 'category', 'category_label', 'description',
            'city', 'address', 'phone_number', 'instagram_url',
            'price_min', 'price_max', 'rating', 'cover_image', 'images',
        ]


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