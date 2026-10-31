package io.github.felipebfranco.soberania.bridge;

import com.mojang.logging.LogUtils;
import io.github.felipebfranco.soberania.bridge.network.VassalAppearancePayload;
import io.github.felipebfranco.soberania.bridge.vassal.VassalEvents;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import org.slf4j.Logger;

/**
 * Bridge between Tensura and MineColonies for the Soberania modpack (ADR-007).
 */
@Mod(SoberaniaBridge.MOD_ID)
public final class SoberaniaBridge {
    public static final String MOD_ID = "soberania_bridge";
    public static final Logger LOG = LogUtils.getLogger();

    public SoberaniaBridge(IEventBus modBus) {
        modBus.addListener(SoberaniaBridge::registerPayloads);
        NeoForge.EVENT_BUS.register(VassalEvents.class);
    }

    private static void registerPayloads(RegisterPayloadHandlersEvent event) {
        event.registrar("1").playToClient(
            VassalAppearancePayload.TYPE,
            VassalAppearancePayload.STREAM_CODEC,
            VassalAppearancePayload::handleOnClient);
    }
}
