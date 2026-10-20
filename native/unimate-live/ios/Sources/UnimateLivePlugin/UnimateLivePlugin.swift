import Foundation
import Capacitor
import ActivityKit

/// Lets the web app start, update and end the Dynamic Island / lock screen countdown.
@objc(UnimateLivePlugin)
public class UnimateLivePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UnimateLivePlugin"
    public let jsName = "UnimateLive"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["available": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["available": false])
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["ok": false, "reason": "ios-too-old"])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["ok": false, "reason": "disabled"])
            return
        }
        guard let key = call.getString("key"),
              let kind = call.getString("kind"),
              let title = call.getString("title"),
              let label = call.getString("label"),
              let beginMs = call.getDouble("beginMs"),
              let targetMs = call.getDouble("targetMs") else {
            call.reject("Missing fields")
            return
        }
        let target = Date(timeIntervalSince1970: targetMs / 1000)
        let begin = min(Date(timeIntervalSince1970: beginMs / 1000), target)
        let state = UniMateAttributes.ContentState(
            kind: kind,
            title: title,
            short: call.getString("short") ?? title,
            subtitle: call.getString("subtitle") ?? "",
            label: label,
            done: call.getString("done") ?? "now",
            begin: begin,
            target: target,
            showsHours: target.timeIntervalSince(begin) > 3600
        )
        let lastKey = call.getString("lastKey") ?? ""
        Task {
            let result = await UnimateLivePlugin.apply(key: key, lastKey: lastKey, state: state)
            call.resolve(result)
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            for activity in Activity<UniMateAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    @available(iOS 16.2, *)
    private static func apply(key: String, lastKey: String, state: UniMateAttributes.ContentState) async -> [String: Any] {
        let running = Activity<UniMateAttributes>.activities.filter {
            $0.activityState == .active || $0.activityState == .stale
        }
        // the countdown stops being "fresh" the moment it reaches zero, so the card can switch to its done text
        let content = ActivityContent(state: state, staleDate: state.target)

        if let current = running.first(where: { $0.attributes.key == key }) {
            await current.update(content)
            for other in running where other.id != current.id {
                await other.end(nil, dismissalPolicy: .immediate)
            }
            return ["ok": true, "action": "updated"]
        }

        for other in running {
            await other.end(nil, dismissalPolicy: .immediate)
        }

        // we showed this exact one before and it is gone now: the user swiped it away, so leave it
        if lastKey == key {
            return ["ok": true, "action": "skipped"]
        }

        do {
            _ = try Activity<UniMateAttributes>.request(
                attributes: UniMateAttributes(key: key),
                content: content,
                pushType: nil
            )
            return ["ok": true, "action": "started"]
        } catch {
            return ["ok": false, "reason": error.localizedDescription]
        }
    }
}
