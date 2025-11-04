-- Create quick_replies table
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own quick replies" 
ON public.quick_replies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quick replies" 
ON public.quick_replies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick replies" 
ON public.quick_replies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick replies" 
ON public.quick_replies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quick_replies_updated_at
BEFORE UPDATE ON public.quick_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();