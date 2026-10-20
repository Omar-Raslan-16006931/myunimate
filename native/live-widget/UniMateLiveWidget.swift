import ActivityKit
import SwiftUI
import WidgetKit

@main
struct UniMateWidgets: WidgetBundle {
    var body: some Widget {
        UniMateLiveActivity()
    }
}

private func accent(_ kind: String) -> Color {
    switch kind {
    case "exam": return Color(red: 1.0, green: 0.70, blue: 0.25)
    case "project": return Color(red: 1.0, green: 0.42, blue: 0.44)
    default: return Color(red: 0.18, green: 0.90, blue: 0.84)
    }
}

private func symbol(_ kind: String) -> String {
    switch kind {
    case "exam": return "doc.text"
    case "project": return "flag"
    default: return "book.closed"
    }
}

/// The ticking countdown, or the "done" word once it has run out.
private struct Countdown: View {
    let state: UniMateAttributes.ContentState
    let stale: Bool

    var body: some View {
        if stale {
            Text(state.done)
        } else {
            Text(timerInterval: min(state.begin, state.target)...state.target,
                 pauseTime: nil,
                 countsDown: true,
                 showsHours: state.showsHours)
        }
    }
}

private struct LockScreenView: View {
    let state: UniMateAttributes.ContentState
    let stale: Bool

    var body: some View {
        HStack(spacing: 13) {
            Image(systemName: symbol(state.kind))
                .font(.system(size: 22))
                .foregroundStyle(accent(state.kind))
            VStack(alignment: .leading, spacing: 2) {
                Text(state.short)
                    .font(.system(size: 15, weight: .semibold))
                    .lineLimit(1)
                Text(state.subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 1) {
                if !stale {
                    Text(state.label)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                Countdown(state: state, stale: stale)
                    .font(.system(size: 20, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(accent(state.kind))
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 100, alignment: .trailing)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

struct UniMateLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: UniMateAttributes.self) { context in
            LockScreenView(state: context.state, stale: context.isStale)
                .activityBackgroundTint(Color.black.opacity(0.55))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let state = context.state
            let stale = context.isStale
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: symbol(state.kind))
                        .font(.system(size: 22))
                        .foregroundStyle(accent(state.kind))
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        if !stale {
                            Text(state.label)
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                        }
                        Countdown(state: state, stale: stale)
                            .font(.system(size: 24, weight: .semibold))
                            .monospacedDigit()
                            .foregroundStyle(accent(state.kind))
                            .multilineTextAlignment(.trailing)
                    }
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(state.title)
                            .font(.system(size: 15, weight: .semibold))
                            .lineLimit(1)
                        Text(state.subtitle)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Image(systemName: symbol(state.kind))
                    .foregroundStyle(accent(state.kind))
            } compactTrailing: {
                Countdown(state: state, stale: stale)
                    .font(.system(size: 12, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(accent(state.kind))
                    .multilineTextAlignment(.trailing)
                    .frame(width: 54)
            } minimal: {
                Image(systemName: symbol(state.kind))
                    .foregroundStyle(accent(state.kind))
            }
            .keylineTint(accent(state.kind))
        }
    }
}
