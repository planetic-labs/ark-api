from PIL import Image, ImageDraw, ImageFont
import os

def create_assets():
    amber = (245, 158, 11, 255)  # #F59E0B
    white = (255, 255, 255, 255)
    transparent = (255, 255, 255, 0)
    
    # Base size for design
    size = 1024
    
    # 1. Create Main Icon (Square with rounded corners feel)
    icon = Image.new('RGBA', (size, size), amber)
    draw = ImageDraw.Draw(icon)
    
    # Draw a stylized "Ark" - an arch
    # Draw an outer arch
    draw.arc([size*0.2, size*0.3, size*0.8, size*0.9], start=180, end=0, fill=white, width=60)
    # Draw the warrior marker diamond in the center
    diamond_coords = [
        (size // 2, size * 0.4),  # Top
        (size * 0.7, size // 2 + 50),  # Right
        (size // 2, size * 0.7 + 50),  # Bottom
        (size * 0.3, size // 2 + 50)   # Left
    ]
    draw.polygon(diamond_coords, fill=white)
    
    # Save Main Icon
    icon.save('apps/mobile/assets/icon.png')
    
    # 2. Adaptive Icon (Foreground only, transparent)
    adaptive = Image.new('RGBA', (size, size), transparent)
    draw_a = ImageDraw.Draw(adaptive)
    draw_a.arc([size*0.2, size*0.3, size*0.8, size*0.9], start=180, end=0, fill=white, width=60)
    draw_a.polygon(diamond_coords, fill=white)
    adaptive.save('apps/mobile/assets/adaptive-icon.png')
    
    # 3. Splash Screen (Centered icon on background)
    splash_size = 2048
    splash = Image.new('RGBA', (splash_size, splash_size), amber)
    # Center the icon content on the splash screen
    scale = 0.4
    small_icon = adaptive.resize((int(splash_size * scale), int(splash_size * scale)), Image.Resampling.LANCZOS)
    offset = ((splash_size - small_icon.width) // 2, (splash_size - small_icon.height) // 2)
    splash.paste(small_icon, offset, small_icon)
    splash.save('apps/mobile/assets/splash.png')
    
    # 4. Favicon
    fav = icon.resize((48, 48), Image.Resampling.LANCZOS)
    fav.save('apps/mobile/assets/favicon.png')

if __name__ == '__main__':
    if not os.path.exists('apps/mobile/assets'):
        os.makedirs('apps/mobile/assets')
    create_assets()
    print("Assets generated successfully.")
