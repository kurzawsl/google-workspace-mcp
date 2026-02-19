import type { GoogleWorkspaceContext, ToolHandler } from "../types.js";
import { formatSuccess } from "../core/response-formatter.js";
import { wrapGoogleError } from "../core/errors.js";

export const listCalendars: ToolHandler = async (ctx) => {
  try {
    const res = await ctx.calendar.calendarList.list();
    return formatSuccess(res.data.items || []);
  } catch (error) {
    throw wrapGoogleError(error, "list_calendars");
  }
};

export const listEvents: ToolHandler = async (ctx, args) => {
  try {
    const params: Record<string, unknown> = {
      calendarId: (args.calendarId as string) || "primary",
      timeMin: (args.timeMin as string) || new Date().toISOString(),
      timeMax: (args.timeMax as string) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: (args.maxResults as number) || 50,
      singleEvents: true,
      orderBy: "startTime",
    };

    if (args.query) params.q = args.query;

    const res = await ctx.calendar.events.list(params as any);
    const events = (res.data.items || []).map((event: any) => ({
      id: event.id,
      summary: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location,
      attendees: event.attendees?.map((a: any) => a.email),
      description: event.description,
    }));

    return formatSuccess(events);
  } catch (error) {
    throw wrapGoogleError(error, "list_events");
  }
};

export const getEvent: ToolHandler = async (ctx, args) => {
  try {
    const res = await ctx.calendar.events.get({
      calendarId: (args.calendarId as string) || "primary",
      eventId: args.eventId as string,
    });
    return formatSuccess(res.data);
  } catch (error) {
    throw wrapGoogleError(error, "get_event");
  }
};

export const createEvent: ToolHandler = async (ctx, args) => {
  try {
    const event: Record<string, unknown> = {
      summary: args.summary,
      description: args.description,
      start: args.start,
      end: args.end,
      location: args.location,
      attendees: args.attendees,
      reminders: args.reminders || {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 30 }],
      },
    };

    const res = await ctx.calendar.events.insert({
      calendarId: (args.calendarId as string) || "primary",
      requestBody: event as any,
    });

    return formatSuccess({
      id: res.data.id,
      htmlLink: res.data.htmlLink,
      summary: res.data.summary,
      start: res.data.start,
      end: res.data.end,
    });
  } catch (error) {
    throw wrapGoogleError(error, "create_event");
  }
};

export const updateEvent: ToolHandler = async (ctx, args) => {
  try {
    const event: Record<string, unknown> = {};
    if (args.summary !== undefined) event.summary = args.summary;
    if (args.description !== undefined) event.description = args.description;
    if (args.start !== undefined) event.start = args.start;
    if (args.end !== undefined) event.end = args.end;
    if (args.location !== undefined) event.location = args.location;
    if (args.reminders !== undefined) event.reminders = args.reminders;

    const res = await ctx.calendar.events.patch({
      calendarId: (args.calendarId as string) || "primary",
      eventId: args.eventId as string,
      requestBody: event as any,
    });

    return formatSuccess({
      id: res.data.id,
      summary: res.data.summary,
      start: res.data.start,
      end: res.data.end,
    });
  } catch (error) {
    throw wrapGoogleError(error, "update_event");
  }
};

export const deleteEvent: ToolHandler = async (ctx, args) => {
  try {
    await ctx.calendar.events.delete({
      calendarId: (args.calendarId as string) || "primary",
      eventId: args.eventId as string,
    });
    return formatSuccess({ deleted: true, eventId: args.eventId });
  } catch (error) {
    throw wrapGoogleError(error, "delete_event");
  }
};

export const findFreeTime: ToolHandler = async (ctx, args) => {
  try {
    const calendarId = (args.calendarId as string) || "primary";
    const timeMin = args.timeMin as string;
    const timeMax = args.timeMax as string;
    const durationMs = ((args.duration as number) || 60) * 60 * 1000;

    const events = await ctx.calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    // Build sorted, merged busy intervals
    const busySlots = (events.data.items || [])
      .map((event: any) => ({
        start: new Date(event.start?.dateTime || event.start?.date).getTime(),
        end: new Date(event.end?.dateTime || event.end?.date).getTime(),
      }))
      .sort((a, b) => a.start - b.start);

    // Merge overlapping busy slots
    const merged: Array<{ start: number; end: number }> = [];
    for (const slot of busySlots) {
      const last = merged[merged.length - 1];
      if (last && slot.start <= last.end) {
        last.end = Math.max(last.end, slot.end);
      } else {
        merged.push({ ...slot });
      }
    }

    // Find free gaps between busy slots
    const freeSlots: Array<{ start: string; end: string }> = [];
    const searchStart = new Date(timeMin).getTime();
    const searchEnd = new Date(timeMax).getTime();
    let cursor = searchStart;

    for (const busy of merged) {
      if (busy.start > cursor) {
        const gapEnd = Math.min(busy.start, searchEnd);
        if (gapEnd - cursor >= durationMs) {
          freeSlots.push({
            start: new Date(cursor).toISOString(),
            end: new Date(gapEnd).toISOString(),
          });
        }
      }
      cursor = Math.max(cursor, busy.end);
    }

    // Check gap after last event
    if (searchEnd > cursor && searchEnd - cursor >= durationMs) {
      freeSlots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(searchEnd).toISOString(),
      });
    }

    return formatSuccess({ freeSlots: freeSlots.slice(0, 10) });
  } catch (error) {
    throw wrapGoogleError(error, "find_free_time");
  }
};

export const checkConflicts: ToolHandler = async (ctx, args) => {
  try {
    const calendarId = (args.calendarId as string) || "primary";
    const proposedStart = new Date(args.start as string);
    const proposedEnd = new Date(args.end as string);

    const events = await ctx.calendar.events.list({
      calendarId,
      timeMin: proposedStart.toISOString(),
      timeMax: proposedEnd.toISOString(),
      singleEvents: true,
    });

    const conflicts = (events.data.items || []).filter((event: any) => {
      const eventStart = new Date(event.start?.dateTime || event.start?.date);
      const eventEnd = new Date(event.end?.dateTime || event.end?.date);

      return (
        (proposedStart >= eventStart && proposedStart < eventEnd) ||
        (proposedEnd > eventStart && proposedEnd <= eventEnd) ||
        (proposedStart <= eventStart && proposedEnd >= eventEnd)
      );
    });

    return formatSuccess({
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts.map((e: any) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
      })),
    });
  } catch (error) {
    throw wrapGoogleError(error, "check_conflicts");
  }
};
