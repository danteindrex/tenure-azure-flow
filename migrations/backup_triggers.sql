-- Backup of triggers before ENUM to VARCHAR migration
-- These triggers will be recreated after the migration

-- 1. subscription_status_notify (user_subscriptions)
-- Notifies queue refresh when subscription status changes
CREATE TRIGGER subscription_status_notify
  AFTER UPDATE ON public.user_subscriptions
  FOR EACH ROW
  WHEN ((old.status IS DISTINCT FROM new.status))
  EXECUTE FUNCTION notify_queue_refresh();

-- 2. on_auth_user_created (users) - Note: This references auth.users, not public.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 3. update_users_updated_at (users)
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. update_user_memberships_updated_at (user_memberships)
CREATE TRIGGER update_user_memberships_updated_at
  BEFORE UPDATE ON public.user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. update_user_subscriptions_updated_at (user_subscriptions)
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. update_user_payments_updated_at (user_payments)
CREATE TRIGGER update_user_payments_updated_at
  BEFORE UPDATE ON public.user_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
