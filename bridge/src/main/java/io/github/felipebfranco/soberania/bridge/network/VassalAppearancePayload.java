package io.github.felipebfranco.soberania.bridge.network;

import io.github.felipebfranco.soberania.bridge.SoberaniaBridge;
import io.github.felipebfranco.soberania.bridge.client.ClientVassals;
import io.github.felipebfranco.soberania.bridge.vassal.Vassal;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.neoforged.neoforge.network.PacketDistributor;
import net.neoforged.neoforge.network.handling.IPayloadContext;

/** Tells clients which monster a citizen entity should look like. */
public record VassalAppearancePayload(int entityId, ResourceLocation entityType, CompoundTag entityNbt) implements CustomPacketPayload {
    public static final Type<VassalAppearancePayload> TYPE =
        new Type<>(ResourceLocation.fromNamespaceAndPath(SoberaniaBridge.MOD_ID, "vassal_appearance"));

    public static final StreamCodec<RegistryFriendlyByteBuf, VassalAppearancePayload> STREAM_CODEC = StreamCodec.composite(
        ByteBufCodecs.VAR_INT, VassalAppearancePayload::entityId,
        ResourceLocation.STREAM_CODEC, VassalAppearancePayload::entityType,
        ByteBufCodecs.COMPOUND_TAG, VassalAppearancePayload::entityNbt,
        VassalAppearancePayload::new);

    public static VassalAppearancePayload of(Entity entity, Vassal vassal) {
        return new VassalAppearancePayload(entity.getId(), vassal.entityType(), vassal.entityNbt());
    }

    public static void sendTo(ServerPlayer player, Entity entity, Vassal vassal) {
        PacketDistributor.sendToPlayer(player, of(entity, vassal));
    }

    public static void sendToTracking(Entity entity, Vassal vassal) {
        PacketDistributor.sendToPlayersTrackingEntity(entity, of(entity, vassal));
    }

    public static void handleOnClient(VassalAppearancePayload payload, IPayloadContext context) {
        context.enqueueWork(() -> ClientVassals.setAppearance(payload.entityId(), payload.entityType(), payload.entityNbt()));
    }

    @Override
    public Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
