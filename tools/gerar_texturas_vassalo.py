"""Gera as texturas de cidadão-vassalo goblin para o MineColonies.

O MineColonies desenha o cidadão com uma textura 128×64 (ou 128×128 para nobres/aristocratas):
a metade esquerda 64×64 é um skin de jogador; a direita guarda os acessórios do ofício.
O goblin do Tensura também é um skin de jogador 64×64 (pele + rosto + cabelo + tanga).
Então, para cada uma das 110 texturas-base do estilo `default`, trocamos a metade esquerda pelo
goblin composto e mantemos o resto. Um sufixo por tom de pele: `_vgob_light`, `_vgob_mid`, `_vgob_dark`.

Uso:
    <venv com Pillow>/python.exe -I tools/gerar_texturas_vassalo.py <minecolonies.jar> <tensura.jar>
Saída: config/openloader/packs/soberania-pt-br/assets/minecolonies/textures/entity/citizen/default/
"""
import io, sys, zipfile
from pathlib import Path
from PIL import Image

mc = zipfile.ZipFile(sys.argv[1]); tn = zipfile.ZipFile(sys.argv[2])
OUT = Path(__file__).resolve().parent.parent / "config/openloader/packs/soberania-pt-br/assets/minecolonies/textures/entity/citizen/default"
OUT.mkdir(parents=True, exist_ok=True)
P = "assets/minecolonies/textures/entity/citizen/default/"
G = "assets/tensura/textures/entity/goblin/"
SKINS = {"light": "light", "mid": "mid", "dark": "dark"}

def png(z, path):
    return Image.open(io.BytesIO(z.read(path))).convert("RGBA")

def tint(img, rgb):
    """O Tensura tinge cabelo e roupa ao desenhar (texturas em branco); aqui a cor entra na própria textura."""
    r, g, b, a = img.split()
    out = Image.merge("RGBA", (r.point(lambda v: v * rgb[0] // 255), g.point(lambda v: v * rgb[1] // 255), b.point(lambda v: v * rgb[2] // 255), a))
    return out

CABELO = (46, 32, 22)   # castanho escuro
TANGA = (110, 78, 46)   # couro

def goblin(gender, skin):
    """Compõe pele + rosto + cabelo + tanga, como o GoblinRenderer faz em camadas."""
    base = png(tn, f"{G}{gender}/skin/{skin}_{gender}.png")
    base.alpha_composite(png(tn, f"{G}unisex/faces/face_a.png"))
    base.alpha_composite(tint(png(tn, f"{G}{gender}/hair/hair_short_{gender}.png"), CABELO))
    base.alpha_composite(tint(png(tn, f"{G}{gender}/clothing/loin_{gender}.png"), TANGA))
    return base

bases = sorted({n.split("/")[-1].rsplit("_", 1)[0] for n in mc.namelist() if n.startswith(P) and n.endswith("_a.png")})
cache = {}
n = 0
for b in bases:
    gender = "female" if "female" in b else "male"
    src = png(mc, f"{P}{b}_a.png")
    for suf, skin in SKINS.items():
        key = (gender, skin)
        if key not in cache:
            cache[key] = goblin(gender, skin)
        out = src.copy()
        out.paste((0, 0, 0, 0), (0, 0, 64, 64))        # limpa o skin humano
        out.alpha_composite(cache[key], (0, 0))        # cola o goblin
        out.save(OUT / f"{b}_vgob_{suf}.png")
        n += 1
print(f"{n} texturas ({len(bases)} bases × {len(SKINS)} peles) -> {OUT}")
