package io.github.felipebfranco.soberania.bridge.mixin;

import com.minecolonies.core.colony.CitizenData;
import io.github.felipebfranco.soberania.bridge.vassal.VassalHolder;
import java.util.UUID;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import org.jetbrains.annotations.Nullable;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(value = CitizenData.class, remap = false)
public abstract class CitizenDataMixin implements VassalHolder {
    @Unique
    private static final String SOBERANIA_TAG = "soberania_vassal";

    @Unique
    @Nullable
    private UUID soberania$vassalId;

    @Override
    @Nullable
    public UUID soberania$getVassalId() {
        return soberania$vassalId;
    }

    @Override
    public void soberania$setVassalId(@Nullable UUID id) {
        soberania$vassalId = id;
    }

    @Inject(method = "serializeNBT(Lnet/minecraft/core/HolderLookup$Provider;)Lnet/minecraft/nbt/CompoundTag;", at = @At("RETURN"))
    private void soberania$save(HolderLookup.Provider provider, CallbackInfoReturnable<CompoundTag> cir) {
        if (soberania$vassalId != null) {
            cir.getReturnValue().putUUID(SOBERANIA_TAG, soberania$vassalId);
        }
    }

    @Inject(method = "deserializeNBT(Lnet/minecraft/core/HolderLookup$Provider;Lnet/minecraft/nbt/CompoundTag;)V", at = @At("TAIL"))
    private void soberania$load(HolderLookup.Provider provider, CompoundTag tag, CallbackInfo ci) {
        soberania$vassalId = tag.hasUUID(SOBERANIA_TAG) ? tag.getUUID(SOBERANIA_TAG) : null;
    }
}
