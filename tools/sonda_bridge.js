// Uso: copiar para kubejs/server_scripts/zz_sonda.js SÓ no servidor de teste (nunca no pack), com o
// soberania_bridge instalado; apagar world/, subir o servidor headless e ler as linhas [sonda] em logs/kubejs/server.log.
//
// Sonda do soberania_bridge (só no servidor de teste): roda o Juramento em Java de ponta a ponta
// com um FakePlayer, uma colônia e uma Taverna criadas aqui, e simula a contratação.
const S_MC = Java.loadClass('com.minecolonies.api.IMinecoloniesAPI')
const S_TS = Java.loadClass('io.github.manasmods.tensura.storage.TensuraStorages')
const S_FPF = Java.loadClass('net.neoforged.neoforge.common.util.FakePlayerFactory')
const S_GP = Java.loadClass('com.mojang.authlib.GameProfile')
const S_UUID = Java.loadClass('java.util.UUID')
const S_Skill = Java.loadClass('com.minecolonies.api.entity.citizen.Skill')
const S_BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const S_HM = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
const S_Oath = Java.loadClass('io.github.felipebfranco.soberania.bridge.vassal.VassalOath')
const S_Registry = Java.loadClass('io.github.felipebfranco.soberania.bridge.vassal.VassalRegistry')
const S_Events = Java.loadClass('io.github.felipebfranco.soberania.bridge.vassal.VassalEvents')

function sonda(rotulo, fn) {
  try { let v = fn(); console.info(`[sonda] OK   ${rotulo} = ${v}`); return v }
  catch (e) { console.error(`[sonda] FALHA ${rotulo}: ${e}`); return undefined }
}

function texto(c) { return c === null ? 'null (jurou)' : String(c.getString()) }

function monstro(level, tipo, pos, nome, dono, ep) {
  let g = level.createEntity(tipo)
  g.setPos(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5)
  level.addFreshEntity(g)
  let ex = S_TS.getExistenceFrom(g)
  if (nome) ex.setName(nome)
  if (dono) ex.setPermanentOwner(S_UUID.fromString(dono))
  if (ep) ex.setEP(ep)
  return g
}

function acharCivil(mapa, nome) {
  let it = mapa.iterator(); let achado = null
  while (it.hasNext()) { let x = it.next(); if (String(x.getName()) === nome) achado = x }
  return achado
}

ServerEvents.loaded(event => {
  let server = event.server
  let level = server.overworld()
  let fake = S_FPF.get(level, new S_GP(S_UUID.fromString('11111111-2222-3333-4444-555555555555'), 'Sonda'))
  let dono = String(fake.uuid)
  let spawn = level.getSharedSpawnPos()
  let centro = new S_BlockPos(spawn.getX(), level.getHeight(S_HM.MOTION_BLOCKING, spawn.getX(), spawn.getZ()), spawn.getZ())
  fake.setPos(centro.getX(), centro.getY(), centro.getZ())
  let manager = S_MC.getInstance().getColonyManager()
  let colony = sonda('createColony', () => manager.createColony(level, centro, fake, 'Sonda', 'Medieval Oak'))
  if (!colony) { console.error('[sonda] sem colônia, parando'); return }
  let alvo = centro.offset(3, 0, 3)
  let selo = Item.of('soberania:selo_de_vassalagem', 6)

  sonda('selo reconhecido', () => S_Oath.isSeal(selo))
  sonda('sem nome', () => texto(S_Oath.swear(fake, monstro(level, 'tensura:goblin', alvo, null, null, 0), selo)))
  sonda('dono outro', () => texto(S_Oath.swear(fake, monstro(level, 'tensura:goblin', alvo, 'Alheio', '99999999-2222-3333-4444-555555555555', 0), selo)))
  sonda('sem Taverna', () => texto(S_Oath.swear(fake, monstro(level, 'tensura:goblin', alvo, 'Grub', dono, 0), selo)))

  let tavPos = centro.offset(-6, 0, -6)
  sonda('Taverna', () => {
    level.setBlockAndUpdate(tavPos, Block.getBlock('minecolonies:blockhuttavern').defaultBlockState())
    return colony.getServerBuildingManager().addNewBuilding(level.getBlockEntity(tavPos), level)
  })
  let predio = colony.getServerBuildingManager().getBuilding(tavPos)
  sonda('Taverna nível 0', () => texto(S_Oath.swear(fake, monstro(level, 'tensura:goblin', alvo, 'Grub', dono, 0), selo)))
  sonda('setBuildingLevel(1)', () => { predio.setBuildingLevel(1); return predio.getBuildingLevel() })

  let g = monstro(level, 'tensura:goblin', alvo, 'Grub', dono, 5000)
  sonda('goblin C', () => texto(S_Oath.swear(fake, g, selo)))
  sonda('goblin removido', () => g.isRemoved())
  sonda('selo gasto (6→5)', () => selo.getCount())
  let v = acharCivil(colony.getVisitorManager().getCivilianDataMap().values(), 'Grub')
  sonda('visitante Grub', () => {
    let h = v.getCitizenSkillHandler(); let apt = []
    ;['Athletics', 'Dexterity', 'Strength', 'Agility', 'Mana'].forEach(k => apt.push(k + '=' + h.getLevel(S_Skill.valueOf(k))))
    return `sufixo=${v.getTextureSuffix()} custo=${v.getRecruitCost()} ${apt.join(' ')}`
  })
  let idVassalo = sonda('id do vassalo no visitante', () => v.soberania$getVassalId())
  sonda('registro', () => {
    let r = S_Registry.get(server).get(idVassalo)
    return `${r.name()} ${r.race()} ${r.rank()} tipo=${r.entityType()} vida+${r.extraHealth()} dano+${r.extraDamage()} nbt=${r.entityNbt().size()} chaves`
  })

  // Contratação: o MineColonies copia o NBT do visitante para um cidadão novo (RecruitmentInteraction).
  sonda('contratação preserva o vínculo', () => {
    let provider = server.registryAccess()
    let nc = colony.getCitizenManager().createAndRegisterCivilianData()
    nc.deserializeNBT(provider, v.serializeNBT(provider))
    return `cidadão ${nc.getId()} ${nc.getName()} vassalo=${nc.soberania$getVassalId()} igual=${String(nc.soberania$getVassalId()) === String(idVassalo)}`
  })

  // Corpo: entidade simulada (no headless o visitante não ganha entidade sozinho)
  sonda('vida e dano aplicados', () => {
    let e = level.createEntity('minecolonies:visitor')
    e.setPos(alvo.getX(), alvo.getY(), alvo.getZ())
    level.addFreshEntity(e)
    v.setEntity(e)
    let antes = e.getMaxHealth()
    let B = Java.loadClass('io.github.felipebfranco.soberania.bridge.vassal.VassalBody')
    B.apply(e, S_Events.vassalOf(server, v))
    let depois = e.getMaxHealth()
    B.apply(e, S_Events.vassalOf(server, v))
    return `vassalOf=${S_Events.vassalOf(server, v).name()} vidaMax ${antes} → ${depois} → ${e.getMaxHealth()} (2ª vez igual) dano=${e.getAttributeValue(Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes').ATTACK_DAMAGE)}`
  })

  sonda('hobgoblin A', () => {
    let hg = monstro(level, 'tensura:goblin', alvo, 'Rigur', dono, 12000)
    hg.evolve()
    return texto(S_Oath.swear(fake, hg, selo))
  })
  sonda('orc (qualquer raça agora jura)', () => texto(S_Oath.swear(fake, monstro(level, 'tensura:orc', alvo, 'Geld', dono, 20000), selo)))
  sonda('visitante orc', () => {
    let o = acharCivil(colony.getVisitorManager().getCivilianDataMap().values(), 'Geld')
    let r = S_Events.vassalOf(server, o)
    return `${r.race()} ${r.rank()} tipo=${r.entityType()} sufixo=${o.getTextureSuffix()}`
  })
  console.info('[sonda] fim')
})

// Depois de 10 s de jogo a reaplicação já rodou: confere a vida do visitante simulado.
let S_conferido = false
ServerEvents.tick(event => {
  if (S_conferido || event.server.getTickCount() < 260) return
  S_conferido = true
  let colony = S_MC.getInstance().getColonyManager().getColonyByWorld(1, event.server.overworld())
  let v = acharCivil(colony.getVisitorManager().getCivilianDataMap().values(), 'Grub')
  sonda('vida do visitante depois da reaplicação', () => v.getEntity().map(e => e.getMaxHealth()).orElse(-1))
})
