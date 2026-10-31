// Uso: copiar para kubejs/server_scripts/zz_sonda.js SÓ no servidor de teste (nunca no pack),
// apagar world/, subir o servidor headless e ler as linhas [sonda] em logs/kubejs/server.log.
// Precisa de vassalagem.js carregado antes (os scripts de servidor dividem o escopo).
//
// Sonda v3 (só no servidor de teste): roda o jurar() de vassalagem.js de ponta a ponta
// com um FakePlayer, uma colônia e uma Taverna criadas aqui.
const S_MC = Java.loadClass('com.minecolonies.api.IMinecoloniesAPI')
const S_TS = Java.loadClass('io.github.manasmods.tensura.storage.TensuraStorages')
const S_FPF = Java.loadClass('net.neoforged.neoforge.common.util.FakePlayerFactory')
const S_GP = Java.loadClass('com.mojang.authlib.GameProfile')
const S_UUID = Java.loadClass('java.util.UUID')
const S_Skill = Java.loadClass('com.minecolonies.api.entity.citizen.Skill')
const S_HM = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
const S_BlockPos = Java.loadClass('net.minecraft.core.BlockPos')

function sonda(rotulo, fn) {
  try { let v = fn(); console.info(`[sonda] OK   ${rotulo} = ${v}`); return v }
  catch (e) { console.error(`[sonda] FALHA ${rotulo}: ${e}`); return undefined }
}

function goblinNomeado(level, pos, nome, dono, ep) {
  let g = level.createEntity('tensura:goblin')
  g.setPos(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5)
  level.addFreshEntity(g)
  let ex = S_TS.getExistenceFrom(g)
  if (nome) ex.setName(nome)
  if (dono) ex.setPermanentOwner(S_UUID.fromString(dono))
  if (ep) ex.setEP(ep)
  return g
}

ServerEvents.loaded(event => {
  let server = event.server
  let level = server.overworld()
  sonda('typeof jurar (escopo compartilhado)', () => typeof jurar)
  sonda('typeof reaplicarVassalos', () => typeof reaplicarVassalos)
  sonda('endsWith', () => 'abc_resistance'.endsWith('_resistance'))
  sonda('skills de goblin só criado (sem addFreshEntity)', () => idsDasSkills(level.createEntity('tensura:goblin')).length)
  sonda('typeof SKILLS_INATAS', () => typeof SKILLS_INATAS)

  let fake = sonda('FakePlayer', () => S_FPF.get(level, new S_GP(S_UUID.fromString('11111111-2222-3333-4444-555555555555'), 'Sonda')))
  sonda('fake.uuid', () => String(fake.uuid))
  sonda('fake.username', () => fake.username)
  sonda('fake.level.isClientSide()', () => fake.level.isClientSide())
  sonda('fake.isCreative()', () => fake.isCreative())
  sonda('fake.server', () => fake.server)
  sonda('fake.tell + Text.color', () => { fake.tell(Text.of('teste').color('gold')); return 'ok' })

  let spawn = level.getSharedSpawnPos()
  let centro = new S_BlockPos(spawn.getX(), level.getHeight(S_HM.MOTION_BLOCKING, spawn.getX(), spawn.getZ()), spawn.getZ())
  sonda('centro', () => centro)
  fake.setPos(centro.getX(), centro.getY(), centro.getZ())
  let manager = S_MC.getInstance().getColonyManager()
  let colony = sonda('createColony', () => manager.createColony(level, centro, fake, 'Sonda', 'Medieval Oak'))
  if (!colony) colony = sonda('colônia por posição', () => manager.getColonyByPosFromWorld(level, centro))
  if (!colony) { console.error('[sonda] sem colônia, parando'); return }
  sonda('dono da colônia', () => String(colony.getPermissions().getOwner()))

  let alvoPos = centro.offset(3, 0, 3)
  let selo = Item.of('soberania:selo_de_vassalagem', 4)

  // Caminhos de erro
  sonda('jurar: sem nome', () => jurar(fake, goblinNomeado(level, alvoPos, null, null, 0), selo))
  sonda('jurar: dono outro', () => jurar(fake, goblinNomeado(level, alvoPos, 'Alheio', '99999999-2222-3333-4444-555555555555', 0), selo))
  sonda('jurar: sem Taverna', () => jurar(fake, goblinNomeado(level, alvoPos, 'Grub', String(fake.uuid), 0), selo))

  // Taverna
  let tavPos = centro.offset(-6, 0, -6)
  let predio = sonda('Taverna (addNewBuilding)', () => {
    level.setBlockAndUpdate(tavPos, Block.getBlock('minecolonies:blockhuttavern').defaultBlockState())
    let te = level.getBlockEntity(tavPos)
    return colony.getServerBuildingManager().addNewBuilding(te, level)
  })
  sonda('acharTaverna', () => acharTaverna(colony))
  sonda('jurar: Taverna nível 0', () => jurar(fake, goblinNomeado(level, alvoPos, 'Grub', String(fake.uuid), 0), selo))
  sonda('setBuildingLevel(1)', () => { acharTaverna(colony).setBuildingLevel(1); return acharTaverna(colony).getBuildingLevel() })

  // Caminho feliz: goblin classe C (EP 5000) e hobgoblin
  let g = goblinNomeado(level, alvoPos, 'Grub', String(fake.uuid), 5000)
  sonda('jurar: goblin C → null', () => jurar(fake, g, selo))
  sonda('goblin removido', () => g.isRemoved())
  sonda('selo gasto (4→3)', () => selo.getCount())
  sonda('visitante Grub', () => {
    let it = colony.getVisitorManager().getCivilianDataMap().values().iterator(); let r = []
    while (it.hasNext()) {
      let v = it.next()
      if (String(v.getName()) !== 'Grub') continue
      let h = v.getCitizenSkillHandler(); let apt = []
      ;['Athletics', 'Dexterity', 'Strength', 'Agility', 'Mana', 'Intelligence'].forEach(k => apt.push(k + '=' + h.getLevel(S_Skill.valueOf(k))))
      r.push(`sufixo=${v.getTextureSuffix()} femea=${v.isFemale()} custo=${v.getRecruitCost()} ${apt.join(' ')} entidade=${v.getEntity().isPresent()}`)
    }
    return r.join(' | ')
  })
  sonda('jurar: hobgoblin', () => {
    let hg = goblinNomeado(level, alvoPos, 'Rigur', String(fake.uuid), 12000)
    hg.evolve(); console.info('[sonda] hobgoblin? ' + hg.isHobgoblin() + ' skills ' + idsDasSkills(hg).length)
    return jurar(fake, hg, selo)
  })
  sonda('registro', () => server.persistentData.getList('soberania_vassalos', 10).size())
  sonda('reaplicarVassalos', () => { reaplicarVassalos(server); return 'ok' })
  sonda('reaplicarVassalos 2x (idempotente)', () => { reaplicarVassalos(server); return 'ok' })
  sonda('jurar: orc', () => {
    let o = level.createEntity('tensura:orc'); o.setPos(alvoPos.getX(), alvoPos.getY(), alvoPos.getZ()); level.addFreshEntity(o)
    let ex = S_TS.getExistenceFrom(o); ex.setName('Geld'); ex.setPermanentOwner(fake.getUuid())
    return jurar(fake, o, selo)
  })
  // Visitante com entidade (no jogo o spawnVisitor já cria a entidade com textura sorteada)
  sonda('visitante com entidade: reaplicar corrige o sufixo', () => {
    let AEC = Java.loadClass('com.minecolonies.api.entity.citizen.AbstractEntityCitizen')
    let v = null
    let it = colony.getVisitorManager().getCivilianDataMap().values().iterator()
    while (it.hasNext()) { let x = it.next(); if (String(x.getName()) === 'Grub') v = x }
    let e = level.createEntity('minecolonies:visitor')
    e.setPos(alvoPos.getX(), alvoPos.getY(), alvoPos.getZ())
    level.addFreshEntity(e)
    v.setEntity(e)
    e.getEntityData().set(AEC.DATA_TEXTURE_SUFFIX, '_a')
    e.setFemale(true)
    let antes = String(e.getEntityData().get(AEC.DATA_TEXTURE_SUFFIX))
    reaplicarVassalos(server)
    let nome = e.getCustomName() ? e.getCustomName().getString() : null
    return `antes=${antes} depois=${e.getEntityData().get(AEC.DATA_TEXTURE_SUFFIX)} femea=${e.isFemale()} nome=${nome} vidaMax=${e.getMaxHealth()} presente=${v.getEntity().isPresent()}`
  })
  console.info('[sonda] fim')
})
