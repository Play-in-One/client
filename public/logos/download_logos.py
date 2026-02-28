import requests

def download_wiki_image(filename, out_path):
    res = requests.get(f"https://en.wikipedia.org/w/api.php?action=query&titles=File:{filename}&prop=imageinfo&iiprop=url&format=json").json()
    try:
        pages = res['query']['pages']
        for page_id in pages:
            url = pages[page_id]['imageinfo'][0]['url']
            print(f"Downloading {url} to {out_path}")
            img_data = requests.get(url).content
            with open(out_path, 'wb') as f:
                f.write(img_data)
    except Exception as e:
        print(f"Error downloading {filename}: {e}")

download_wiki_image("Minecraft_Logo.svg", "/home/rir/Documents/PIO/client/public/logos/minecraft.svg")
download_wiki_image("The_Legend_of_Zelda_logo.svg", "/home/rir/Documents/PIO/client/public/logos/zelda.svg")
download_wiki_image("Super_Mario_Logo.svg", "/home/rir/Documents/PIO/client/public/logos/mario.svg")

