package io.github.felipebfranco.soberania.bridge.mixin;

import net.minecraft.world.entity.WalkAnimationState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** Lets the client copy the citizen's walk animation onto the vassal's stand-in. */
@Mixin(WalkAnimationState.class)
public interface WalkAnimationStateAccessor {
    @Accessor("speedOld")
    float soberania$getSpeedOld();

    @Accessor("speedOld")
    void soberania$setSpeedOld(float value);

    @Accessor("speed")
    float soberania$getSpeed();

    @Accessor("speed")
    void soberania$setSpeed(float value);

    @Accessor("position")
    float soberania$getPosition();

    @Accessor("position")
    void soberania$setPosition(float value);
}
