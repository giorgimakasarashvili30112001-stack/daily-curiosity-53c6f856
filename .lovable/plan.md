# Daily reminder notifications (11:00 and 19:00)

Answer to your question first: yes, we can build it now. The code lives in this project, but the notifications will only actually fire once you build the native app with Capacitor (Android Studio / Xcode). In the browser preview nothing pops up — the app will just show the toggle as unavailable.

## Behaviour

- Two local notifications per day at 11:00 and 19:00, device local time.
- Text is a plain reminder, e.g. "Your daily how is waiting" / "Take a look at today's fact" — no fact title.
- Skipped when the user already has today's streak (answered today's quiz correctly). Since a local notification is scheduled in advance and cannot know that, the check happens at delivery time in a lightweight way: the app cancels the remaining notifications for the day as soon as today's quiz is answered correctly, and re-schedules the next day's pair. Also re-evaluated every time the app opens or returns to the foreground.
- A toggle on the Profile tab turns reminders on/off; the choice is stored on the device.

## Scheduling logic

```text
app opens / resumes / quiz answered:
  if reminders off      -> cancel all
  if today already done -> cancel today's two, schedule tomorrow's two
  else                  -> ensure 11:00 and 19:00 today (future ones only) + tomorrow's two
```

Notifications are always kept a couple of days ahead so the app doesn't need to be opened daily for them to fire.

## Technical details

- Add `@capacitor/local-notifications`.
- New `src/lib/notifications.ts`: platform check (`Capacitor.isNativePlatform()`), permission request, fixed notification IDs per slot/day, `syncDailyReminders(hasTodayStreak: boolean)` that cancels and re-schedules.
- New `src/hooks/useDailyReminders.ts`: reads the local-storage preference, runs `syncDailyReminders` on mount, on `resume`/visibility change, and whenever the profile/quiz state says today is complete.
- Profile route (`src/routes/_authenticated/profile.tsx`): a "Daily reminders" switch showing 11:00 and 19:00, plus states for "not available in the browser — open the installed app" and "notifications blocked in system settings".
- Today's completion is derived from data already loaded (streak anchor / today's quiz attempt) — no new database columns or server functions.
- `native/README.md`: note the Android 13+ `POST_NOTIFICATIONS` permission and the iOS notification capability step after `npx cap sync`.

## Not included

No server-side push (Firebase), so notification text can't contain the actual fact title. That can be added later on top of this.
