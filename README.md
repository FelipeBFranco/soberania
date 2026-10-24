# Soberania: Ferro e Mana

Modpack de Minecraft Java **1.21.1 / NeoForge** em português do Brasil.

Você reencarna fraco em um mundo hostil. Recruta, funda um assentamento e o transforma em reino.
O reino cresce em três eixos ao mesmo tempo: o seu poder pessoal (Tensura), as máquinas (ferro) e a magia (mana).
Cada era destrava a próxima; nenhum pilar chega ao fim sozinho.

## Estado

Em construção. A versão atual é o esqueleto do pack: Tensura: Reincarnated e seus addons, mods de desempenho
e a tradução PT-BR do Tensura. Os pilares de reino, ferro e mana entram nas próximas versões.

## Como jogar

Em breve: o `.zip` para o CurseForge App e o `.mrpack` para Modrinth/Prism ficam na aba **Releases**.

## Como este repositório funciona

O pack é gerido com [packwiz](https://packwiz.infra.link/). Cada mod é um arquivo `mods/*.pw.toml` que aponta para o
Modrinth ou o CurseForge; nenhum `.jar` fica aqui.

```bash
# atualizar todos os mods para a última versão
packwiz update --all

# exportar para o CurseForge App e para Modrinth
packwiz curseforge export
packwiz modrinth export
```

Pastas:

- `mods/` — metadados dos mods.
- `config/` — configurações.
- `config/openloader/packs/tensura-pt-br/` — tradução PT-BR dos addons do Tensura, carregada automaticamente.
- `config/openloader/packs/soberania-pt-br/` — tradução PT-BR complementar (MineColonies, Structurize, Domum Ornamentum…).
- `docs/` — guias para os jogadores.

## Política de versões

Sempre a última versão de cada mod disponível para NeoForge 1.21.1. Atualizações são testadas no servidor antes de
irem para uma release.
