-- Add theme preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT 'birch',
ADD COLUMN IF NOT EXISTS appearance_mode TEXT DEFAULT 'dark';

-- Add check constraints for valid values
ALTER TABLE public.profiles
ADD CONSTRAINT valid_color_theme 
CHECK (color_theme IN ('birch', 'forest', 'ocean', 'midnight'));

ALTER TABLE public.profiles
ADD CONSTRAINT valid_appearance_mode 
CHECK (appearance_mode IN ('light', 'dark', 'system'));

-- Add comment
COMMENT ON COLUMN public.profiles.color_theme IS 'Color theme: birch, forest, ocean, midnight';
COMMENT ON COLUMN public.profiles.appearance_mode IS 'Appearance mode: light, dark, system';



