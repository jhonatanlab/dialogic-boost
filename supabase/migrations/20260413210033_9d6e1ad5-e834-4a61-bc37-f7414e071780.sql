DELETE FROM public.messages WHERE conversation_id = '484f6156-4b7a-4f91-aa54-dd4bc59de435';

UPDATE public.conversations SET unread_count = 0, last_message_at = now() WHERE id = '484f6156-4b7a-4f91-aa54-dd4bc59de435';