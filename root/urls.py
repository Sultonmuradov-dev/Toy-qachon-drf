from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from apps.views import (
    WelcomeTemplateView,
    LoginTemplateView,
    RegisterTemplateView,
    IndexTemplateView,
    GuestsTemplateView,
    BudgetTemplateView,
    TasksTemplateView,
    VendorTemplateView,
    ProfileTemplateView,
    SettingsTemplateView,
)


urlpatterns = [
    path('admin/', admin.site.urls),

    # HTML sahifalar
    path('', WelcomeTemplateView.as_view(), name='welcome'),
    path('login/', LoginTemplateView.as_view(), name='login'),
    path('register/', RegisterTemplateView.as_view(), name='register'),
    path('index/', IndexTemplateView.as_view(), name='index'),
    path('guest/', GuestsTemplateView.as_view(), name='guests'),
    path('budget/', BudgetTemplateView.as_view(), name='budget'),
    path('tasks/', TasksTemplateView.as_view(), name='tasks'),
    path('vendors/', VendorTemplateView.as_view(), name='vendors'),
    path('profile/', ProfileTemplateView.as_view(), name='profile'),
    path('settings/', SettingsTemplateView.as_view(), name='settings'),

    # Swagger / hujjatlar
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API
    path('api/v1/', include('apps.urls')),
]

# Rasmlarni ko'rsatish (faqat DEBUG rejimida)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)