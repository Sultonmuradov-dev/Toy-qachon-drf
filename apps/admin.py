from django.contrib import admin
from apps.models import Vendor, VendorImage, Review , User
from django.contrib.admin import ModelAdmin



class VendorImageInline(admin.TabularInline):
    model = VendorImage
    extra = 1


@admin.register(Vendor)
class VendorAdmin(ModelAdmin):
    list_display = ['name', 'category', 'city', 'phone_number', 'rating', 'is_active']
    list_filter = ['category', 'city', 'is_active']
    search_fields = ['name', 'city', 'phone_number']
    list_editable = ['is_active']
    readonly_fields = ['rating']
    inlines = [VendorImageInline]

@admin.register(Review)
class ReviewAdmin(ModelAdmin):
    list_display = ['vendor', 'user', 'stars', 'created_at']
    list_filter = ['stars', 'vendor']
    search_fields = ['vendor__name', 'comment']


@admin.register(User)
class UserAdmin(ModelAdmin):
    list_display = ['phone_number', 'first_name', 'plan', 'plan_expires_at', 'is_active']
    list_filter = ['plan', 'is_active']
    search_fields = ['phone_number', 'first_name']
    exclude = ['password', 'last_login', 'groups', 'user_permissions']
    actions = ['give_premium', 'give_vip', 'make_free']

    @admin.action(description="Premium berish (30 kun)")
    def give_premium(self, request, queryset):
        queryset.update(plan='premium', plan_expires_at=timezone.now() + timedelta(days=30))

    @admin.action(description="VIP berish (30 kun)")
    def give_vip(self, request, queryset):
        queryset.update(plan='vip', plan_expires_at=timezone.now() + timedelta(days=30))

    @admin.action(description="Bepulga qaytarish")
    def make_free(self, request, queryset):
        queryset.update(plan='free', plan_expires_at=None)