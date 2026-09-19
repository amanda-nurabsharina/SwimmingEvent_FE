// Utility functions for single-round swimming competition champion calculation

export interface SwimmerItem {
  registration_id?: number;
  heat: number;
  heat_label?: string;
  heat_category?: string;
  line: number;
  nama: string;
  jenis_kelamin: string;
  club: string;
  time_seed: string;
  result: string;
  rank?: number;
  is_empty: boolean;
  is_finalist?: boolean;
}

export interface EventGroupData {
  event_id: number;
  tournament_id: number;
  event_code: number;
  event_name: string;
  distance: string;
  stroke: string;
  gender: string;
  age_group: string;
  heat_category?: string;
  max_lanes: number;
  heats: SwimmerItem[];
}

export interface RankedSwimmer extends SwimmerItem {
  parsedSeconds: number;
  overallRank: number;
  timeDiff?: string;
  statusLabel?: string;
}

export interface GroupChampionResult {
  groupNum: number;
  groupLabel: string;
  winner: RankedSwimmer | null;
  swimmers: RankedSwimmer[];
}

export interface EventChampionResult {
  isGroup: boolean;
  eventCode: number;
  eventName: string;
  distance: string;
  stroke: string;
  gender: string;
  ageGroup: string;
  heatCategory: string;
  // For Heat Angka
  juara1: RankedSwimmer | null;
  juara2: RankedSwimmer | null;
  juara3: RankedSwimmer | null;
  allRanked: RankedSwimmer[];
  // For Group Abjad
  groupResults: GroupChampionResult[];
  hasResults: boolean;
  totalSwimmers: number;
}

export function parseResultTimeToSeconds(timeStr?: string): number {
  if (!timeStr) return 9999999;
  const clean = timeStr.trim().toUpperCase();
  if (
    clean === "" ||
    clean === "-" ||
    clean === "NT" ||
    clean.includes("DQ") ||
    clean.includes("DNF") ||
    clean.includes("DNS") ||
    clean.startsWith("99")
  ) {
    return 9999999;
  }

  const normalized = clean.replace(/:/g, ".");
  const parts = normalized.split(".");
  if (parts.length >= 3) {
    const min = parseFloat(parts[0]) || 0;
    const sec = parseFloat(parts[1]) || 0;
    const ms = parseFloat(parts[2].slice(0, 2)) || 0;
    return min * 60 + sec + ms / 100;
  } else if (parts.length === 2) {
    const sec = parseFloat(parts[0]) || 0;
    const ms = parseFloat(parts[1].slice(0, 2)) || 0;
    return sec + ms / 100;
  }
  const val = parseFloat(normalized);
  return isNaN(val) ? 9999999 : val;
}

export function formatTimeDiff(diffSeconds: number): string {
  if (diffSeconds <= 0.001) return "-";
  return `+${diffSeconds.toFixed(2)}s`;
}

export function calculateEventChampions(event: EventGroupData): EventChampionResult {
  const isGroup =
    event.heat_category === "GROUP" || event.heat_category === "CLUSTER";

  const activeSwimmers = (event.heats || []).filter(
    (item) => !item.is_empty && item.nama && item.nama !== "(KOSONG)"
  );

  let hasResults = false;

  if (!isGroup) {
    const evaluated: RankedSwimmer[] = activeSwimmers.map((s) => {
      const sec = parseResultTimeToSeconds(s.result);
      if (sec < 9999990) hasResults = true;
      let statusLabel = "";
      const resUpper = (s.result || "").toUpperCase();
      if (resUpper.includes("DQ")) statusLabel = "DQ";
      else if (resUpper.includes("DNF")) statusLabel = "DNF";
      else if (resUpper.includes("DNS")) statusLabel = "DNS";

      return {
        ...s,
        parsedSeconds: sec,
        overallRank: 999,
        statusLabel,
      };
    });

    const valid = evaluated
      .filter((s) => s.parsedSeconds < 9999990)
      .sort((a, b) => a.parsedSeconds - b.parsedSeconds);

    const invalid = evaluated.filter((s) => s.parsedSeconds >= 9999990);

    const fastestSec = valid.length > 0 ? valid[0].parsedSeconds : 0;
    const rankedValid: RankedSwimmer[] = valid.map((s, idx) => ({
      ...s,
      overallRank: idx + 1,
      timeDiff: idx === 0 ? "Juara 1" : formatTimeDiff(s.parsedSeconds - fastestSec),
    }));

    const allRanked: RankedSwimmer[] = [...rankedValid, ...invalid];

    return {
      isGroup: false,
      eventCode: event.event_code,
      eventName: event.event_name,
      distance: event.distance,
      stroke: event.stroke,
      gender: event.gender,
      ageGroup: event.age_group || "OPEN",
      heatCategory: "HEAT",
      juara1: rankedValid[0] || null,
      juara2: rankedValid[1] || null,
      juara3: rankedValid[2] || null,
      allRanked,
      groupResults: [],
      hasResults,
      totalSwimmers: activeSwimmers.length,
    };
  } else {
    const groupMap: { [heatNum: number]: SwimmerItem[] } = {};
    activeSwimmers.forEach((s) => {
      if (!groupMap[s.heat]) groupMap[s.heat] = [];
      groupMap[s.heat].push(s);
    });

    const groupNumbers = Object.keys(groupMap)
      .map(Number)
      .sort((a, b) => a - b);

    const groupResults: GroupChampionResult[] = groupNumbers.map((heatNum) => {
      const swimmers = groupMap[heatNum] || [];
      const labelDisplay =
        swimmers[0]?.heat_label || String.fromCharCode(64 + heatNum);

      const evaluated: RankedSwimmer[] = swimmers.map((s) => {
        const sec = parseResultTimeToSeconds(s.result);
        if (sec < 9999990) hasResults = true;
        let statusLabel = "";
        const resUpper = (s.result || "").toUpperCase();
        if (resUpper.includes("DQ")) statusLabel = "DQ";
        else if (resUpper.includes("DNF")) statusLabel = "DNF";
        else if (resUpper.includes("DNS")) statusLabel = "DNS";

        return {
          ...s,
          parsedSeconds: sec,
          overallRank: 999,
          statusLabel,
        };
      });

      const valid = evaluated
        .filter((s) => s.parsedSeconds < 9999990)
        .sort((a, b) => a.parsedSeconds - b.parsedSeconds);

      const invalid = evaluated.filter((s) => s.parsedSeconds >= 9999990);

      const fastestInGroup = valid.length > 0 ? valid[0].parsedSeconds : 0;
      const rankedValid: RankedSwimmer[] = valid.map((s, idx) => ({
        ...s,
        overallRank: idx + 1,
        timeDiff: idx === 0 ? "Juara Group" : formatTimeDiff(s.parsedSeconds - fastestInGroup),
      }));

      return {
        groupNum: heatNum,
        groupLabel: labelDisplay,
        winner: rankedValid[0] || null,
        swimmers: [...rankedValid, ...invalid],
      };
    });

    return {
      isGroup: true,
      eventCode: event.event_code,
      eventName: event.event_name,
      distance: event.distance,
      stroke: event.stroke,
      gender: event.gender,
      ageGroup: event.age_group || "OPEN",
      heatCategory: "GROUP",
      juara1: null,
      juara2: null,
      juara3: null,
      allRanked: [],
      groupResults,
      hasResults,
      totalSwimmers: activeSwimmers.length,
    };
  }
}
