package io.github.felipebfranco.soberania.bridge.mixin;

import com.minecolonies.api.entity.citizen.AbstractEntityCitizen;
import com.minecolonies.core.entity.ai.workers.guard.AbstractEntityAIGuard;
import io.github.felipebfranco.soberania.bridge.vassal.VassalTruce;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(value = AbstractEntityAIGuard.class, remap = false)
public abstract class AbstractEntityAIGuardMixin {
    @Inject(method = "isAttackableTarget", at = @At("HEAD"), cancellable = true)
    private static void soberania$truce(AbstractEntityCitizen guard, LivingEntity target, CallbackInfoReturnable<Boolean> cir) {
        if (VassalTruce.isProtected(guard, target)) cir.setReturnValue(false);
    }
}
