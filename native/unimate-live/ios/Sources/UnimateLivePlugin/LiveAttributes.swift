import ActivityKit
import Foundation

// This exact file is compiled twice: inside the app (the plugin) and inside the widget extension
// (the build script copies it there). Both sides must describe the data the same way.
@available(iOS 16.2, *)
public struct UniMateAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var kind: String       // "class", "exam" or "project"
        public var title: String      // full name, shown in the island
        public var short: String      // short name, shown on the lock screen
        public var subtitle: String   // room / hall / due time
        public var label: String      // "starts in", "due in" or "left"
        public var done: String       // what to show once the countdown has run out
        public var begin: Date        // countdown range start (always in the past)
        public var target: Date       // countdown range end
        public var showsHours: Bool

        public init(kind: String, title: String, short: String, subtitle: String, label: String,
                    done: String, begin: Date, target: Date, showsHours: Bool) {
            self.kind = kind
            self.title = title
            self.short = short
            self.subtitle = subtitle
            self.label = label
            self.done = done
            self.begin = begin
            self.target = target
            self.showsHours = showsHours
        }
    }

    public var key: String

    public init(key: String) {
        self.key = key
    }
}
