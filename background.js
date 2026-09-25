// Service Worker: periodischer Hintergrund-Sync (chrome.alarms, da
// setInterval den Service Worker nicht wach hält), Benachrichtigungen,
// Öffnen der App sowie das Kontextmenü zum schnellen Hinzufügen eines Teams.

import { refreshAllFavorites } from "./src/data/repository.js";
import { notifyResult, notifyUpcoming } from "./src/notifications.js";
import { HVNB_HOST } from "./src/parsers/nuligaUrlParser.js";

const SYNC_ALARM = "handball-sync";
const SYNC_PERIOD_MINUTES = 240; // alle 4 Stunden, wie in der Android-Version
const TEAM_PORTRAIT_PATTERN = new RegExp(`^https?://${HVNB_HOST.replace(/\./g, "\\.")}/.*teamPortrait`, "i");
const CONTEXT_MENU_ID = "add-to-handball-favoriten";

chrome.runtime.onInstalled.addListener(() => {
  // delayInMinutes sorgt dafür, dass der erste Sync schon kurz nach der
  // Installation läuft, statt erst nach vollen 4 Stunden zu warten.
  chrome.alarms.create(SYNC_ALARM, { delayInMinutes: 5, periodInMinutes: SYNC_PERIOD_MINUTES });
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Zu Handball Favoriten hinzufügen",
    contexts: ["link"],
    targetUrlPatterns: [`*://${HVNB_HOST}/*teamPortrait*`],
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) {
    runSync();
  }
});

async function runSync() {
  try {
    const outcomes = await refreshAllFavorites();
    for (const outcome of outcomes) {
      for (const match of outcome.newlyFinishedMatches) {
        notifyResult(outcome.team, match);
      }
      for (const match of outcome.soonStartingMatches) {
        notifyUpcoming(outcome.team, match);
      }
    }
  } catch (err) {
    console.error("Hintergrund-Sync fehlgeschlagen:", err);
  }
}

// Klick auf das Symbol in der Symbolleiste öffnet (bzw. fokussiert) die App.
// Ist der gerade aktive Tab eine nuLiga-teamPortrait-Seite, wird der Link
// direkt zum Vorausfüllen des "Team hinzufügen"-Formulars mitgegeben - das
// Pendant zum Android-"Teilen"-Intent.
chrome.action.onClicked.addListener((tab) => {
  const prefill = tab && tab.url && TEAM_PORTRAIT_PATTERN.test(tab.url) ? tab.url : null;
  openApp(prefill);
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.linkUrl) {
    openApp(info.linkUrl);
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  // Format ist "result::<teamId>::<matchNumber>" bzw. "upcoming::...";
  // team.id selbst enthält einzelne Doppelpunkte, daher der "::"-Trenner.
  const [, teamId] = notificationId.split("::");
  if (teamId) openApp(null, teamId);
});

async function openApp(prefillLink, teamId) {
  const hash = teamId ? `#team/${encodeURIComponent(teamId)}` : prefillLink ? `#add?link=${encodeURIComponent(prefillLink)}` : "";
  const targetUrl = chrome.runtime.getURL("app.html") + hash;
  const appUrlPrefix = chrome.runtime.getURL("app.html");

  const existing = await chrome.tabs.query({ url: `${appUrlPrefix}*` });
  if (existing.length > 0) {
    const tab = existing[0];
    await chrome.tabs.update(tab.id, { active: true, url: targetUrl });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }
}
