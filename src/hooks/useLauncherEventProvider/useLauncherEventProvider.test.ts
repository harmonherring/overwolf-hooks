import { useLauncherEventProvider } from "./useLauncherEventProvider";
import { renderHook } from "@testing-library/react";

describe("useGameEventProvider values", () => {
  it("should return false when there are no required features", () => {
    const { result } = renderHook(() =>
      useLauncherEventProvider(
        -1,
        { onInfoUpdates: () => {}, onNewEvents: () => {} },
        []
      )
    );
    const { started } = result.current;
    expect(started).toBeFalsy();
  });
});
