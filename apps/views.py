from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.generic import TemplateView
from apps.models import Guests , BudgetItem , Task , Vendor
from apps.serializers import RegisterSerializers, GuestSerializers, UserSerializers , BudgetItemSerializers , TaskModelSerializers, VendorSerializer, ChangePasswordSerializer
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, RetrieveUpdateAPIView , ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from datetime import date , timedelta
from django.db.models import Sum , F

class WelcomeTemplateView(TemplateView):
    template_name = 'welcome.html'

class LoginTemplateView(TemplateView):
    template_name = 'login.html'

class RegisterTemplateView(TemplateView):
    template_name = 'register.html'

class IndexTemplateView(TemplateView):
    template_name = 'index.html'

class GuestsTemplateView(TemplateView):
    template_name = 'guests.html'

class BudgetTemplateView(TemplateView):
    template_name = 'budget.html'

class TasksTemplateView(TemplateView):
    template_name = 'tasks.html'

class VendorTemplateView(TemplateView):
    template_name = 'vendors.html'


class ProfileTemplateView(TemplateView):
    template_name = ''


class SettingsTemplateView(TemplateView):
    template_name = 'settings.html'


@extend_schema(request=ChangePasswordSerializer, responses={200: None})
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'message': "Parol o'zgartirildi"}, status=200)
        return Response(serializer.errors, status=400)



@extend_schema(request=RegisterSerializers, responses=RegisterSerializers, tags=[' Project API Login & Register'])
class RegisterApiView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializers(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': "Ro'yxatdan o'tdingiz"},
                status=201,
            )
        return Response(serializer.errors, status=400)


@extend_schema(request=GuestSerializers, responses=GuestSerializers, tags=['Project API Guests'])
class GuestListCreateView(ListCreateAPIView):
    serializer_class = GuestSerializers
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Guests.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@extend_schema(tags=['Project API Guests'])
class GuestDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = GuestSerializers
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Guests.objects.filter(user=self.request.user)


@extend_schema(request=TaskModelSerializers, responses=TaskModelSerializers, tags=['Project API Task'])
class TaskListCreateView(ListCreateAPIView):
    serializer_class = TaskModelSerializers
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@extend_schema(request=TaskModelSerializers, responses=TaskModelSerializers, tags=['Project API Task'])
class TaskDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = TaskModelSerializers
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)


@extend_schema(tags=['Project API Dashboard'])
class DashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        S = Guests.StatusType

        # Mehmonlar
        guests = Guests.objects.filter(user=user)
        guests_data = {
            'total': guests.count(),
            'confirmed': guests.filter(status=S.CONFIRMED).count(),
            'invited': guests.filter(status=S.INVITED).count(),
            'declined': guests.filter(status=S.DECLINED).count(),
        }

        # Byudjet
        budget_qs = BudgetItem.objects.filter(user=user)
        totals = budget_qs.aggregate(planned=Sum('planned_amount'), spent=Sum('spent_amount'))
        planned = totals['planned'] or 0
        spent = totals['spent'] or 0
        over_count = budget_qs.filter(spent_amount__gt=F('planned_amount')).count()

        # Vazifalar
        tasks_qs = Task.objects.filter(user=user)
        open_qs = tasks_qs.filter(is_done=False)
        overdue_qs = open_qs.filter(due_date__lt=today)
        total_tasks = tasks_qs.count()
        done_tasks = tasks_qs.filter(is_done=True).count()

        tasks_data = {
            'total': total_tasks,
            'done': done_tasks,
            'pending': total_tasks - done_tasks,
            'overdue': overdue_qs.count(),
            'this_month': open_qs.filter(
                due_date__year=today.year, due_date__month=today.month
            ).count(),
        }

        priority_tasks = [{
            'title': t.title,
            'sub': t.due_date.strftime('%d.%m.%Y') if t.due_date else "Muddat belgilanmagan",
            'overdue': bool(t.due_date and t.due_date < today),
            'priority': t.priority,
        } for t in open_qs.order_by(F('due_date').asc(nulls_last=True))[:3]]

        # To'y sanasi
        days_left = (user.wedding_day - today).days if user.wedding_day else None

        # Diqqat talab qiladigan narsalar
        alerts = []
        if tasks_data['overdue']:
            alerts.append({'type': 'red', 'text': f"{tasks_data['overdue']} ta muddati o'tgan vazifa"})
        if over_count:
            alerts.append({'type': 'red', 'text': f"{over_count} ta byudjet kategoriyasi oshib ketgan"})
        if days_left is not None and 0 <= days_left <= 30 and guests_data['invited']:
            alerts.append({
                'type': 'amber',
                'text': f"To'yga {days_left} kun qoldi, {guests_data['invited']} ta mehmon hali javob bermagan",
            })

        return Response({
            'user_name': user.first_name or user.phone_number,
            'wedding_day': user.wedding_day,
            'days_left': days_left,
            'guests': guests_data,
            'budget': {'planned': planned, 'spent': spent},
            'tasks': tasks_data,
            'alerts': alerts,
            'priority_tasks': priority_tasks,
        })

@extend_schema(tags=['Me API '])
class MeApiVIew(RetrieveUpdateAPIView):
    serializer_class = UserSerializers
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

@extend_schema(tags=['Project API Budget'])
class BudgetListCreateView(ListCreateAPIView):
    serializer_class = BudgetItemSerializers
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BudgetItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@extend_schema(tags=['Project API Budget'])
class BudgetDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = BudgetItemSerializers
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BudgetItem.objects.filter(user=self.request.user)


@extend_schema(tags=['Project API Vendors'])
class VendorListView(ListAPIView):
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Vendor.objects.filter(is_active=True).prefetch_related('images')
        category = self.request.query_params.get('category')
        city = self.request.query_params.get('city')
        if category:
            qs = qs.filter(category=category)
        if city:
            qs = qs.filter(city__icontains=city)
        return qs

@extend_schema(tags=['Project API Vendors'])
class VendorDetailView(RetrieveAPIView):
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Vendor.objects.filter(is_active=True)

