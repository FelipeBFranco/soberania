package io.github.felipebfranco.soberania.bridge.client;

import com.minecolonies.api.entity.citizen.AbstractEntityCitizen;
import io.github.felipebfranco.soberania.bridge.SoberaniaBridge;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.neoforged.neoforge.client.event.RenderLivingEvent;
import net.neoforged.neoforge.event.entity.EntityLeaveLevelEvent;

@EventBusSubscriber(modid = SoberaniaBridge.MOD_ID, value = Dist.CLIENT)
public final class ClientEvents {
    private ClientEvents() {}

    /** Draws a vassal citizen as the monster it was. */
    @SubscribeEvent
    public static void onRenderLiving(RenderLivingEvent.Pre<?, ?> event) {
        if (!(event.getEntity() instanceof AbstractEntityCitizen citizen)) return;
        LivingEntity standIn = ClientVassals.standInFor(citizen);
        if (standIn == null) return;

        float partialTick = event.getPartialTick();
        ClientVassals.mirror(citizen, standIn);
        EntityRenderer<? super LivingEntity> renderer = ClientVassals.minecraft().getEntityRenderDispatcher().getRenderer(standIn);
        event.getPoseStack().pushPose();
        try {
            renderer.render(standIn, Mth.lerp(partialTick, citizen.yRotO, citizen.getYRot()), partialTick,
                event.getPoseStack(), event.getMultiBufferSource(), event.getPackedLight());
            event.setCanceled(true);
        } catch (RuntimeException e) {
            ClientVassals.markBroken(citizen.getId(), e);
        } finally {
            event.getPoseStack().popPose();
        }
    }

    @SubscribeEvent
    public static void onLeaveLevel(EntityLeaveLevelEvent event) {
        if (event.getLevel().isClientSide() && event.getEntity() instanceof AbstractEntityCitizen citizen) {
            ClientVassals.forget(citizen.getId());
        }
    }

    @SubscribeEvent
    public static void onLoggingOut(ClientPlayerNetworkEvent.LoggingOut event) {
        ClientVassals.clear();
    }
}
