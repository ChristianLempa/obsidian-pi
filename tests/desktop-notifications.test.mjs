import { describe, expect, it, vi } from "vitest";
import {
  openNotificationThread,
  requestDesktopNotificationPermission,
  showDesktopRunNotification
} from "../src/ui/desktop-notifications.mjs";

function notificationApi(permission = "granted") {
  const instances = [];
  class NotificationApi {
    static permission = permission;

    constructor(title, options) {
      this.title = title;
      this.options = options;
      this.close = vi.fn();
      instances.push(this);
    }
  }
  return { NotificationApi, instances };
}

describe("desktop completion notifications", () => {
  it("requests undecided permission and accepts an existing grant", async () => {
    class GrantedNotification {
      static permission = "granted";
    }
    class DefaultNotification {
      static permission = "default";
      static requestPermission = vi.fn().mockResolvedValue("granted");
    }

    await expect(requestDesktopNotificationPermission(GrantedNotification)).resolves.toBe(true);
    await expect(requestDesktopNotificationPermission(DefaultNotification)).resolves.toBe(true);
    expect(DefaultNotification.requestPermission).toHaveBeenCalledOnce();
  });

  it("handles denied or failed permission requests without breaking runs", async () => {
    class DeniedNotification {
      static permission = "denied";
    }
    class BrokenNotification {
      static permission = "default";
      static requestPermission = vi.fn().mockRejectedValue(new Error("unsupported"));
    }
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(requestDesktopNotificationPermission(DeniedNotification)).resolves.toBe(false);
    await expect(requestDesktopNotificationPermission(BrokenNotification)).resolves.toBe(false);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("uses the active window's notification APIs by default", async () => {
    const originalWindow = globalThis.window;
    const { NotificationApi, instances } = notificationApi();
    const focus = vi.fn();
    globalThis.window = {
      activeWindow: {
        Notification: NotificationApi,
        document: { hasFocus: () => false },
        focus
      }
    };

    try {
      await expect(requestDesktopNotificationPermission()).resolves.toBe(true);
      expect(
        showDesktopRunNotification({ runId: "active-window", sentRunIds: new Set() })
      ).toBe(true);
      instances[0].onclick();
      expect(focus).toHaveBeenCalledOnce();
    } finally {
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
    }
  });

  it("emits once for a settled run while Obsidian is unfocused", () => {
    const { NotificationApi, instances } = notificationApi();
    const sentRunIds = new Set();
    const options = {
      runId: "thread:run-1",
      sentRunIds,
      body: "Response completed.",
      NotificationApi,
      documentRef: { hasFocus: () => false },
      windowRef: { focus: vi.fn() }
    };

    expect(showDesktopRunNotification(options)).toBe(true);
    expect(showDesktopRunNotification(options)).toBe(false);
    expect(instances).toHaveLength(1);
    expect(instances[0]).toMatchObject({
      title: "Pi Agent",
      options: { body: "Response completed.", silent: false }
    });
  });

  it("does not notify while Obsidian is focused", () => {
    const { NotificationApi, instances } = notificationApi();

    expect(
      showDesktopRunNotification({
        runId: "run",
        sentRunIds: new Set(),
        NotificationApi,
        documentRef: { hasFocus: () => true }
      })
    ).toBe(false);
    expect(instances).toHaveLength(0);
  });

  it.each(["default", "denied"])("falls back when notification permission is %s", (permission) => {
    const { NotificationApi, instances } = notificationApi(permission);

    expect(
      showDesktopRunNotification({
        runId: "run",
        sentRunIds: new Set(),
        NotificationApi,
        documentRef: { hasFocus: () => false }
      })
    ).toBe(false);
    expect(instances).toHaveLength(0);
  });

  it("focuses Obsidian and opens the originating chat when clicked", async () => {
    const { NotificationApi, instances } = notificationApi();
    const focus = vi.fn();
    const renderChatView = vi.fn();
    const plugin = {
      switchThread: vi.fn(() => true),
      activateView: vi.fn().mockResolvedValue(undefined),
      app: {
        workspace: {
          getLeavesOfType: vi.fn(() => [{ view: { renderChatView } }])
        }
      }
    };

    showDesktopRunNotification({
      runId: "run",
      sentRunIds: new Set(),
      NotificationApi,
      documentRef: { hasFocus: () => false },
      windowRef: { focus },
      onClick: () => openNotificationThread(plugin, "thread-1", "pi-agent-view")
    });
    instances[0].onclick();
    await vi.waitFor(() => expect(renderChatView).toHaveBeenCalledOnce());

    expect(focus).toHaveBeenCalledOnce();
    expect(instances[0].close).toHaveBeenCalledOnce();
    expect(plugin.switchThread).toHaveBeenCalledWith("thread-1");
    expect(plugin.activateView).toHaveBeenCalledOnce();
    expect(plugin.app.workspace.getLeavesOfType).toHaveBeenCalledWith("pi-agent-view");
  });

  it("fails safely when the platform notification constructor throws", () => {
    class BrokenNotification {
      static permission = "granted";

      constructor() {
        throw new Error("unsupported");
      }
    }
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      showDesktopRunNotification({
        runId: "run",
        sentRunIds: new Set(),
        NotificationApi: BrokenNotification,
        documentRef: { hasFocus: () => false }
      })
    ).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
