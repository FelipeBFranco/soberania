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
const S_Soul = Java.loadClass('io.github.felipebfranco.soberania.bridge.vassal.VassalSoul')
const S_Truce = Java.loadClass('io.github.felipebfranco.soberania.bridge.vassal.VassalTruce')
const S_Guard = Java.loadClass('com.minecolonies.core.entity.ai.workers.guard.AbstractEntityAIGuard')
const S_SkillAPI = Java.loadClass('io.github.manasmods.manascore.skill.api.SkillAPI')
const S_RL = Java.loadClass('net.minecraft.resources.ResourceLocation')

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
  sonda('goblin aprende magic_sense antes do juramento', () => S_SkillAPI.getSkillsFrom(g).learnSkill(S_RL.parse('tensura:magic_sense')))
  sonda('skills do goblin antes', () => S_SkillAPI.getSkillsFrom(g).getLearnedSkills().size())
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
  // ---- M2: alma, ficha e trégua ----
  let vg = S_Events.vassalOf(server, v)
  sonda('alma capturada', () => `ep=${vg.soul().getDouble('ep')} magiculas=${vg.soul().getDouble('magicule')} skills=${vg.soul().getList('skills', 10).size()}`)
  let corpo = level.createEntity('minecolonies:visitor')
  corpo.setPos(alvo.getX(), alvo.getY(), alvo.getZ())
  level.addFreshEntity(corpo)
  v.setEntity(corpo)
  v.initEntityValues()
  sonda('alma aplicada (1ª vez)', () => S_Soul.applyIfNew(corpo, vg))
  sonda('alma aplicada (2ª vez = false)', () => S_Soul.applyIfNew(corpo, vg))
  sonda('cidadão tem EP/dono/skills', () => {
    let ex = S_TS.getExistenceFrom(corpo)
    return `ep=${ex.getEP()} dono=${ex.getPermanentOwner()} nome=${ex.getName()} skills=${S_SkillAPI.getSkillsFrom(corpo).getLearnedSkills().size()} magic_sense=${S_SkillAPI.getSkillsFrom(corpo).getSkill(S_RL.parse('tensura:magic_sense')).isPresent()}`
  })
  sonda('leitura de volta (EP ganho como cidadão)', () => {
    S_TS.getExistenceFrom(corpo).setEP(7777)
    S_Registry.get(server).updateSoul(vg.id(), S_Soul.capture(corpo))
    return S_Registry.get(server).get(vg.id()).soul().getDouble('ep')
  })
  sonda('ficha', () => S_Soul.describe(S_Registry.get(server).get(vg.id())).stream().map(c => c.getString()).toList().join(' | '))
  sonda('selo num cidadão-vassalo mostra a ficha', () => texto(S_Oath.swear(fake, corpo, selo)) + ` selo=${selo.getCount()}`)
  let meu = monstro(level, 'tensura:goblin', alvo, 'Amigo', dono, 100)
  let alheio = monstro(level, 'tensura:goblin', alvo, 'Estranho', '99999999-2222-3333-4444-555555555555', 100)
  let selvagem = monstro(level, 'tensura:goblin', alvo, null, null, 0)
  sonda('trégua: súdito do dono protegido', () => S_Truce.isProtected(corpo, meu))
  sonda('trégua: súdito de estranho não', () => S_Truce.isProtected(corpo, alheio))
  sonda('guarda (mixin): ataca meu súdito?', () => S_Guard.isAttackableTarget(corpo, meu))
  sonda('guarda (mixin): ataca súdito alheio?', () => S_Guard.isAttackableTarget(corpo, alheio))
  sonda('guarda (mixin): ataca goblin selvagem?', () => S_Guard.isAttackableTarget(corpo, selvagem))
  S_guarda = { corpo: corpo, meu: monstro(level, 'minecraft:zombie', alvo, 'Zé', dono, 100), selvagem: monstro(level, 'minecraft:zombie', alvo, null, null, 0),
    gob: monstro(level, 'tensura:goblin', alvo, null, null, 0) }
  console.info('[sonda] fim')
})

// Depois de 10 s de jogo a reaplicação já rodou: confere a vida do visitante simulado.
let S_conferido = false
let S_guarda = null
ServerEvents.tick(event => {
  if (S_conferido || event.server.getTickCount() < 260) return
  S_conferido = true
  let colony = S_MC.getInstance().getColonyManager().getColonyByWorld(1, event.server.overworld())
  let v = acharCivil(colony.getVisitorManager().getCivilianDataMap().values(), 'Grub')
  sonda('lista de monstros do MineColonies', () => {
    let todos = S_MC.getInstance().getColonyManager().getCompatibilityManager().getAllMonsters()
    let l = []; todos.forEach(r => { if (String(r).startsWith('tensura:')) l.push(String(r).substring(8)) })
    return `total=${todos.size()} zumbi=${todos.contains(S_RL.parse('minecraft:zombie'))} tensura=${l.length}: ${l.slice(0, 25).join(',')}`
  })
  if (S_guarda) {
    sonda('guarda (mixin): zumbi súdito do dono → esperado false', () => S_Guard.isAttackableTarget(S_guarda.corpo, S_guarda.meu))
    sonda('guarda: zumbi selvagem → esperado true ou erro do visitante sem posto', () => S_Guard.isAttackableTarget(S_guarda.corpo, S_guarda.selvagem))
    sonda('guarda: goblin selvagem', () => S_Guard.isAttackableTarget(S_guarda.corpo, S_guarda.gob))
  }
})
