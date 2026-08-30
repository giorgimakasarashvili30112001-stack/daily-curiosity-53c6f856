import SwiftUI
import WidgetKit

// Add via Xcode: File > New > Target > Widget Extension ("DailyFactWidget").
// Replace the generated source with this file.

private let appOrigin = "https://project--4537fc7c-9d89-4404-be9b-4ff997c88324.lovable.app"
private let endpoint = URL(string: "\(appOrigin)/api/public/today-title")!

struct TodayTitle: Decodable {
    let title: String?
}

struct FactEntry: TimelineEntry {
    let date: Date
    let title: String
}

struct FactProvider: TimelineProvider {
    func placeholder(in context: Context) -> FactEntry {
        FactEntry(date: Date(), title: "Today's fact")
    }

    func getSnapshot(in context: Context, completion: @escaping (FactEntry) -> Void) {
        completion(FactEntry(date: Date(), title: "Today's fact"))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FactEntry>) -> Void) {
        Task {
            let title = await fetchTitle() ?? "Today's fact is on its way…"
            let entry = FactEntry(date: Date(), title: title)
            let next = Date().addingTimeInterval(30 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func fetchTitle() async -> String? {
        do {
            let (data, _) = try await URLSession.shared.data(from: endpoint)
            return try JSONDecoder().decode(TodayTitle.self, from: data).title
        } catch {
            return nil
        }
    }
}

struct DailyFactWidgetView: View {
    var entry: FactEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("TODAY'S FACT")
                .font(.system(size: 10, weight: .semibold))
                .kerning(1.2)
                .foregroundStyle(.secondary)
            Text(entry.title)
                .font(.system(size: 16, weight: .bold))
                .lineLimit(4)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .containerBackground(.background, for: .widget)
        .widgetURL(URL(string: appOrigin))
    }
}

@main
struct DailyFactWidget: Widget {
    let kind = "DailyFactWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FactProvider()) { entry in
            DailyFactWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Curiosity")
        .description("Shows today's fact title.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
