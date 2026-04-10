# Insights: Three Things I Learned About LILA BLACK

---

## Insight 1: The Storm Creates a Predictable Kill Funnel on AmbroseValley

**What caught my eye:**
When filtering to AmbroseValley matches and enabling the heatmap + combat layers,
KilledByStorm events cluster heavily along one edge of the map rather than being
spread evenly. Meanwhile Kill and Killed events spike in the zone just ahead of
where storm deaths begin - players are fighting each other while being pushed by
the storm toward the same extraction points.

**Evidence:**
Across AmbroseValley matches, KilledByStorm events are concentrated in roughly
20% of the map area (the trailing storm edge). The combat event density in the
adjacent zone (the area players flee into) is 2-3x higher than the map average
visible in the heatmap. This pattern is consistent across multiple dates,
suggesting it is structural to the map layout, not match-specific variance.

**Actionable items:**
- Add a secondary extraction point on the storm-trailing side to distribute
  player flow and reduce the funnel bottleneck
- Consider slowing storm speed slightly near this zone to give players more
  decision time rather than forcing panicked fights
- Metrics to watch: KilledByStorm rate, average survival time, kill density
  distribution across map quadrants

**Why a level designer should care:**
If 60%+ of storm deaths happen in one corridor, players are not experiencing
a storm mechanic - they are experiencing a forced choke. This removes agency
and makes late-game feel scripted rather than dynamic.

---

## Insight 2: Loot Hotspots Double as Early Death Zones

**What caught my eye:**
Toggling the Loot layer on top of the heatmap reveals that the highest loot
pickup density areas overlap almost exactly with the highest early-match kill
density. Players are dropping into the same locations to loot and immediately
fighting each other before they have time to engage with the map.

**Evidence:**
In GrandRift matches, the top 3 loot density zones (visible as red hotspots
on the heatmap) account for a disproportionate share of Kill and BotKill events
in the first 20% of match duration on the timeline. Scrubbing the timeline
shows these zones emptying out quickly - players either die or move on, leaving
large portions of the map underutilised for the rest of the match.

**Actionable items:**
- Redistribute loot more evenly across the map to encourage players to spread out
- Add loot of slightly lower tier in undervisited areas to incentivise exploration
- Metrics to watch: loot pickup spread across map quadrants, time-to-first-contact
  per match, percentage of map area visited per session

**Why a level designer should care:**
Loot placement is the primary tool for controlling player distribution in an
extraction shooter. If loot pulls everyone to the same 3 spots, the rest of the
map investment is wasted and matches feel repetitive from the first 60 seconds.

---

## Insight 3: Bots and Humans Use Completely Different Areas of the Map

**What caught my eye:**
Enabling both the Player paths and Bot paths layers simultaneously on Lockdown
shows that bot movement is heavily concentrated in a few patrol corridors while
human players range much more freely across the map. There are entire sections
of Lockdown where human path density is high but bot presence is near zero.

**Evidence:**
On Lockdown matches, the bot path heatmap shows strong clustering in the central
and southern zones. Human players by contrast show path density distributed more
evenly including the northern structures and outer perimeter. This means players
exploring certain areas of the map encounter almost no bot resistance, making
those zones feel empty and unrewarding.

**Actionable items:**
- Expand bot patrol routes to cover underutilised map areas
- Add bot spawn points in the northern and perimeter zones of Lockdown
- Alternatively, place higher-value loot in bot-heavy zones to create a risk/
  reward decision for players considering those areas
- Metrics to watch: player time spent in bot-sparse zones, loot pickup rate in
  those zones, overall bot encounter rate per match

**Why a level designer should care:**
In an extraction shooter bots serve two purposes - threat and pacing. If bots
cluster in predictable zones, experienced players will simply route around them.
Distributing bots to match the full map layout makes every area feel alive and
ensures the map investment pays off in actual gameplay moments.
