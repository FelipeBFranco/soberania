package io.github.felipebfranco.soberania.bridge.vassal;

import com.minecolonies.api.IMinecoloniesAPI;
import com.minecolonies.api.colony.ICivilianData;
import com.minecolonies.api.colony.IColony;
import com.minecolonies.api.entity.citizen.AbstractCivilianEntity;
import com.minecolonies.api.entity.citizen.AbstractEntityCitizen;
import io.github.felipebfranco.soberania.bridge.SoberaniaBridge;
import io.github.felipebfranco.soberania.bridge.network.VassalAppearancePayload;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.WeakHashMap;
import net.minecraft.ChatFormatting;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.EntityJoinLevelEvent;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.entity.player.PlayerInteractEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;

public final class VassalEvents {
    private static final int REAPPLY_INTERVAL = 200;
    /** Entities whose appearance was already sent to the players tracking them (covers data linked after tracking began). */
    private static final Set<Entity> ANNOUNCED = Collections.newSetFromMap(new WeakHashMap<>());

    private VassalEvents() {}

    @SubscribeEvent
    public static void onEntityInteract(PlayerInteractEvent.EntityInteract event) {
        if (!VassalOath.isSeal(event.getItemStack())) return;
        event.setCanceled(true);
        event.setCancellationResult(InteractionResult.SUCCESS);
        if (!(event.getEntity() instanceof ServerPlayer player) || !(event.getTarget() instanceof LivingEntity target)) return;

        Component error;
        try {
            error = VassalOath.swear(player, target, event.getItemStack());
        } catch (RuntimeException e) {
            SoberaniaBridge.LOG.error("vassalagem falhou", e);
            error = Component.literal("Algo deu errado no juramento (veja o log do servidor). O súdito continua com você.");
        }
        if (error != null) player.sendSystemMessage(error.copy().withStyle(ChatFormatting.GOLD));
    }

    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        if (!(event.getTarget() instanceof AbstractEntityCitizen citizen) || !(event.getEntity() instanceof ServerPlayer player)) return;
        Vassal vassal = VassalRegistry.get(player.server).get(VassalHolder.vassalIdOf(citizen.getCivilianData()));
        if (vassal != null) VassalAppearancePayload.sendTo(player, citizen, vassal);
    }

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        MinecraftServer server = event.getServer();
        if (server.getTickCount() % REAPPLY_INTERVAL != 0) return;
        VassalRegistry registry = VassalRegistry.get(server);
        if (registry.all().isEmpty()) return;

        Set<String> seen = new HashSet<>();
        for (Vassal v : registry.all()) {
            if (!seen.add(v.dimension() + "#" + v.colonyId())) continue;
            ServerLevel level = server.getLevel(ResourceKey.create(Registries.DIMENSION, v.dimension()));
            IColony colony = level == null ? null : IMinecoloniesAPI.getInstance().getColonyManager().getColonyByWorld(v.colonyId(), level);
            if (colony == null) continue;
            List<ICivilianData> civilians = new ArrayList<>(colony.getCitizenManager().getCitizens());
            civilians.addAll(colony.getVisitorManager().getCivilianDataMap().values());
            for (ICivilianData data : civilians) {
                Vassal vassal = registry.get(VassalHolder.vassalIdOf(data));
                if (vassal == null) continue;
                data.getEntity().ifPresent(entity -> refresh(registry, entity, vassal));
            }
        }
    }

    private static void refresh(VassalRegistry registry, AbstractCivilianEntity entity, Vassal vassal) {
        VassalBody.apply(entity, vassal);
        if (!VassalSoul.applyIfNew(entity, vassal)) registry.updateSoul(vassal.id(), VassalSoul.capture(entity));
        if (ANNOUNCED.add(entity)) VassalAppearancePayload.sendToTracking(entity, vassal);
    }

    /** New citizen entities (hiring, respawn, chunk load) get body and soul right away instead of on the next refresh. */
    @SubscribeEvent
    public static void onJoinLevel(EntityJoinLevelEvent event) {
        if (event.getLevel().isClientSide() || !(event.getEntity() instanceof AbstractCivilianEntity entity)) return;
        MinecraftServer server = event.getLevel().getServer();
        if (server == null) return;
        VassalRegistry registry = VassalRegistry.get(server);
        Vassal vassal = registry.get(VassalHolder.vassalIdOf(entity.getCivilianData()));
        if (vassal != null) refresh(registry, entity, vassal);
    }

    /** For the KubeJS probe and debugging: the vassal linked to a civilian, if any. */
    public static Vassal vassalOf(MinecraftServer server, ICivilianData data) {
        return VassalRegistry.get(server).get(VassalHolder.vassalIdOf(data));
    }
}
