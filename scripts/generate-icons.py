import os
import zlib
import struct

def crc32(data):
    crc = 0xFFFFFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0xEDB88320 if crc & 1 else 0)
    return ~crc & 0xFFFFFFFF

def create_png(width, height, r, g, b, a=255):
    signature = b'\x89PNG\r\n\x1a\n'
    
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', crc32(b'IHDR' + ihdr_data))
    ihdr = b'IHDR' + ihdr_data + ihdr_crc
    
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)
        for x in range(width):
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(raw_data)
    idat_data = compressed
    idat_crc = struct.pack('>I', crc32(b'IDAT' + idat_data))
    idat = b'IDAT' + idat_data + idat_crc
    
    iend_crc = struct.pack('>I', crc32(b'IEND'))
    iend = b'IEND' + iend_crc
    
    return signature + struct.pack('>I', len(ihdr_data)) + ihdr + struct.pack('>I', len(idat_data)) + idat + struct.pack('>I', 0) + iend

icons_dir = os.path.join(os.path.dirname(__file__), '../images')
os.makedirs(icons_dir, exist_ok=True)

icons = [
    ('home.png', (102, 102, 102)),
    ('home-active.png', (30, 144, 255)),
    ('ticket.png', (102, 102, 102)),
    ('ticket-active.png', (30, 144, 255)),
    ('taxi.png', (102, 102, 102)),
    ('taxi-active.png', (30, 144, 255)),
    ('order.png', (102, 102, 102)),
    ('order-active.png', (30, 144, 255)),
    ('profile.png', (102, 102, 102)),
    ('profile-active.png', (30, 144, 255)),
]

for name, color in icons:
    png = create_png(48, 48, color[0], color[1], color[2])
    with open(os.path.join(icons_dir, name), 'wb') as f:
        f.write(png)
    print(f'Created {name}')

print('All icons created successfully!')