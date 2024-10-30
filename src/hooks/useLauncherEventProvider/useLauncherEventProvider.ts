import { useCallback, useState } from "react";
import { sleep } from "../../lib/utils";
import { log } from "../../lib/log";

interface UseLauncherEventProviderEventsDelegate {
  onInfoUpdates(
    info:
      | overwolf.games.events.InfoUpdates2Event
      | overwolf.games.InstalledGameInfo
  ): void;
  onNewEvents(events: overwolf.games.events.NewGameEvents): void;
}
const getInfo = (launcherClassId: number): Promise<overwolf.games.launchers.events.GetInfoResult<any>> => {
  return new Promise((resolve) => {
    overwolf.games.launchers.events.getInfo(launcherClassId, (info) => resolve(info));
  });
};
export function useLauncherEventProvider(
  launcherClassId: number,
  delegate: UseLauncherEventProviderEventsDelegate,
  requiredFeatures: Array<string>,
  featureRetries = 10,
  displayLog = false
) {
  const [started, setStarted] = useState(false);

  const onInfoUpdates = useCallback(
    (
      info: UseLauncherEventProviderEventsDelegate["onInfoUpdates"]["arguments"]
    ): void => {
      delegate.onInfoUpdates(info);
      if (displayLog) {
        log(
          JSON.stringify(info, null, 2),
          "useLauncherEventProvider.ts",
          "onInfoUpdates() -> delegate"
        );
      }
    },
    [delegate, displayLog]
  );

  const onNewEvents = useCallback(
    (
      events: UseLauncherEventProviderEventsDelegate["onNewEvents"]["arguments"]
    ): void => {
      delegate.onNewEvents(events);
      if (displayLog) {
        log(
          JSON.stringify(events, null, 2),
          "useLauncherEventProvider.ts",
          "onNewEvents() -> delegate"
        );
      }
    },
    [delegate, displayLog]
  );

  const unRegisterEvents = (): void => {
    overwolf.games.launchers.events.onInfoUpdates.removeListener(onInfoUpdates);
    overwolf.games.launchers.events.onNewEvents.removeListener(onNewEvents);
  };
  const registerEvents = (): void => {
    unRegisterEvents();
    overwolf.games.launchers.events.onInfoUpdates.addListener(onInfoUpdates);
    overwolf.games.launchers.events.onNewEvents.addListener(onNewEvents);
  };

  const setRequiredFeatures = useCallback(async () => {
    if (!requiredFeatures.length) return setStarted(false);
    let tries: number = 1;
    let result: overwolf.games.launchers.events.SetRequiredFeaturesResult = {
      success: false,
      supportedFeatures: [],
    };

    while (tries <= featureRetries) {
      log(
        `try ${tries} of ${featureRetries}`,
        "useLauncherEventProvider.ts",
        "setRequiredFeatures() -> callback -> try"
      );
      result = await new Promise((resolve) => {
        overwolf.games.launchers.events.setRequiredFeatures(
          launcherClassId,
          requiredFeatures,
          (requiredResult) => resolve(requiredResult)
        );
      });

      if (result.success) {
        log(
          JSON.stringify(result, null, 2),
          "useLauncherEventProvider.ts",
          "setRequiredFeatures() -> callback -> success"
        );
        const isSupported =
          Array.isArray(result.supportedFeatures) &&
          result.supportedFeatures.length > 0;

        setStarted(isSupported);
        return void 0;
      }

      await sleep(3000);
      tries++;
    }
    log(
      JSON.stringify(result, null, 2),
      "useLauncherEventProvider.ts",
      "setRequiredFeatures() -> callback -> failure"
    );

    setStarted(false);
    return void 0;
  }, [requiredFeatures]);

  const start = useCallback(async (): Promise<void> => {
    if (started) return;

    registerEvents();

    await setRequiredFeatures();

    const { res, success } = await getInfo(launcherClassId);

    if (res && success) {
      onInfoUpdates(res);
    }
  }, [setRequiredFeatures, onInfoUpdates, started, registerEvents]);

  const stop = useCallback((): void => {
    setStarted(false);
    unRegisterEvents();
  }, [unRegisterEvents]);

  return { started, start, stop } as const;
}
