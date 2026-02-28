import urllib.request
import json

def download_wiki_image(filename, out_path):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&titles=File:{filename}&prop=imageinfo&iiprop=url&format=json"
    print(f"Fetching {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            pages = res['query']['pages']
            for page_id in pages:
                if page_id == "-1":
                    print(f"File {filename} not found.")
                    continue
                image_url = pages[page_id]['imageinfo'][0]['url']
                print(f"Downloading {image_url} to {out_path}")
                img_req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(img_req) as img_resp, open(out_path, 'wb') as f:
                    f.write(img_resp.read())
    except Exception as e:
        print(f"Error downloading {filename}: {e}")

download_wiki_image("Minecraft_Logo.svg", "/home/rir/Documents/PIO/client/public/logos/minecraft.svg")
download_wiki_image("The_Legend_of_Zelda_logo.svg", "/home/rir/Documents/PIO/client/public/logos/zelda.svg")
download_wiki_image("Super_Mario_Logo.svg", "/home/rir/Documents/PIO/client/public/logos/mario.svg")
download_wiki_image("Grand_Theft_Auto_logo_series.svg", "/home/rir/Documents/PIO/client/public/logos/gta.svg")
