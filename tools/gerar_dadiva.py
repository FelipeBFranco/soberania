"""Gera a tabela de recompensa "Dádiva do Mundo" com um Livro de Estudo por
habilidade (padrão do Tensura Neo Otherworld), em vez de livros "aleatórios"
que o mod de livros não resolve.

Pesos por categoria (somados): comum 70, extra 20, única 5, +500 EP 5.
Listas de habilidades vêm das texturas do jar do Tensura (assets/tensura/
textures/skill/<categoria>/*.png); as únicas seguem a lista que o TNO usa.

    python -I tools/gerar_dadiva.py <caminho do tensura-neoforge-*.jar>
"""
import sys, zipfile, re
from pathlib import Path

jar = zipfile.ZipFile(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "config/ftbquests/quests/reward_tables/dadiva_da_grande_sabia.snbt"

def skills(cat):
    return sorted({m.group(1) for n in jar.namelist()
                   for m in [re.match(rf"assets/tensura/textures/skill/{cat}/([a-z_]+)\.png$", n)] if m})

# Únicas que o TNO entrega por livro (evita as que não se aprendem por livro).
UNIQUE = ["mathematician", "merciless", "murderer", "unyielding", "cook", "chosen_one", "commander", "berserker",
          "chef", "berserk", "analyst", "absolute_severance", "gourmand", "falsifier", "gourmet", "envy", "engorger",
          "divine_berserker", "degenerate", "godly_craftsman", "lust", "martial_master", "healer", "infinity_prison",
          "guardian", "great_sage", "pride", "oppressor", "musician", "observer", "reaper", "reflector", "researcher",
          "reverser", "royal_beast", "seeker", "seer", "severer", "shadow_striker", "sloth", "sniper", "spearhead",
          "starved", "suppressor", "survivor", "thrower", "traveler", "tuner", "usurper", "villain", "wrath", "fighter"]
# Extras que vêm só de raça/evolução não entram.
EXTRA_SKIP = {"sage", "demon_lord_haki", "hero_haki", "sacred_haki", "haki", "godwolf_sense", "snake_eye", "magic_aura"}

cats = [("common", skills("common"), 70.0),
        ("extra", [s for s in skills("extra") if s not in EXTRA_SKIP], 20.0),
        ("unique", UNIQUE, 5.0)]

def book(skill):
    name = ('{"extra":[": ",{"translate":"tensura.skill.%s"}],"translate":"item.tensura_skill_books.skill_study_book"}' % skill).replace('"', '\\"')
    lore = ('{"color":"gray","extra":[{"translate":"tensura.skill.%s"}," (tensura:%s)"],"italic":true,"text":""}' % (skill, skill)).replace('"', '\\"')
    return ('item: { components: { "minecraft:custom_data": { skill_id: "tensura:%s" }, "minecraft:custom_name": "%s", '
            '"minecraft:lore": ["%s"] }, count: 1, id: "tensura_skill_books:skill_study_book" }' % (skill, name, lore))

lines = ["{", '\ticon: {', '\t\tid: "minecraft:enchanted_book"', "\t}", '\tid: "0A000000000000F4"', "\tloot_size: 1",
         "\torder_index: 3", "\trewards: ["]
n = 0
label = {"common": "comum", "extra": "extra", "unique": "única"}
for cat, lst, total in cats:
    w = total / len(lst)
    for s in lst:
        n += 1
        lines.append('\t\t{ id: "0A000000000F4%03X", %s, title: "Livro de Estudo (%s)", weight: %.4ff }' % (n, book(s), label[cat], w))
lines.append('\t\t{ existence: "MAX_EP", icon: { id: "tensura:high_quality_magic_crystal" }, id: "0A0000000000F4FF", title: "+500 Pontos de Existência", type: "tensura_ftb:existence_value", value: 500, weight: 5.0f }')
lines += ["\t]", '\ttitle: "Dádiva do Mundo"', "}"]
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"{n} livros (+1 EP) -> {out}")
for cat, lst, total in cats:
    print(f"  {cat}: {len(lst)} skills, peso total {total}")
