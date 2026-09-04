import { Request, Response } from "express";
import { isRequestInvalid, isEventExpired, bestEffort } from "../helpers/utils";
import { pageMeta } from "../helpers/paging";
import * as EventRegisterService from "../services/EventRegisterService";
import * as EmailService from "../services/EmailService";
import * as NotificationService from "../services/NotificationService";
import * as EventService from "../services/EventService";
import * as EventInviteService from "../services/EventInviteService";
import * as MeetingService from "../services/MeetingService";
import * as UserService from "../services/UserService";

export async function register(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const event = await EventService.getOneById(req.body.event_id);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "Event not found.",
      });
    }

    if (isEventExpired(event)) {
      return res.status(400).json({
        status: "error",
        message: "This event has already ended and can no longer be registered for.",
      });
    }

    if (event.type === "private") {
      const invited = await EventInviteService.getHasInvited(event._id.toString(), req.user._id);
      if (!invited) {
        return res.status(403).json({
          status: "error",
          message: "This is a private event. You need an invitation to register.",
        });
      }
    }

    const register = await EventRegisterService.register({
      event: req.body.event_id,
      user: req.user._id
    });

    if (!register) {
      return res.status(500).json({
        status: "error",
        message: "Error registering event.",
      });
    } 

    return res.status(201).json({
      status: "success",
      message: "Register event successfully.",
    });
  } catch (err: any) {
    req.log.error({ err }, "EventRegisterController.register failed");
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function unregister(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const registration = await EventRegisterService.getHasRegistered(req.params.id, req.user._id);

    if (!registration) {
      return res.status(404).json({
        status: "error",
        message: "You are not registered for this event.",
      });
    }

    const meeting = await MeetingService.getOneByEventId(req.params.id);
    if (meeting && !meeting.ended) {
      return res.status(409).json({
        status: "error",
        message: "You can't leave this event while its meeting is live. Please wait until it ends.",
      });
    }

    const result = await EventRegisterService.unregister({
      event: req.params.id,
      user: req.user._id
    });

    if (!result || result.deletedCount < 1) {
      return res.status(404).json({
        status: "error",
        message: "You are not registered for this event.",
      });
    }

    if (registration.register_approved) {
      await bestEffort(
        "attendee unregistered notification",
        () => NotificationService.sendAttendeeUnregistered(registration.event, req.user)
      );
    }

    return res.status(200).json({
      status: "success",
      message: "Unregister event successfully.",
    });
  } catch (err: any) {
    req.log.error({ err }, "EventRegisterController.unregister failed");
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function hasRegistered(req: any, res: Response) {
  try {
    const registered_event = await EventRegisterService.getHasRegistered(req.params.id, req.user._id);

    if (!registered_event) {
      return res.status(200).json({
        status: "success",
        message: "This event hasn't been registered.",
        has_registered: false,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "This event has been registered.",
      has_registered: true,
    });
  } catch (err: any) {
     req.log.error({ err }, "EventRegisterController.hasRegistered failed");
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}
export async function isRegisterApproved(req: any, res: Response) {
  try {
    const registered_event = await EventRegisterService.getHasRegistered(req.params.id, req.user._id);

    if (!registered_event || !registered_event.register_approved) {
      return res.status(200).json({
        status: "success",
        message: "This event hasn't been register-approved.",
        is_register_approved: false,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "This event has been register-approved.",
      is_register_approved: true,
    });
  } catch (err: any) {
     req.log.error({ err }, "EventRegisterController.isRegisterApproved failed");
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getAllByEventId(req: Request, res: Response) {
  try {
    const { items, total, offset, limit } = await EventRegisterService.getAllByEventId(req.params.id as string, req.query);

    return res.status(200).json({
      status: "success",
      message: "Fetch registered users successfully.",
      data: items,
      meta: pageMeta(total, offset, limit)
    });
  } catch (err: any) {
     req.log.error({ err }, "EventRegisterController.getAllByEventId failed");
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getAllApprovedByEventId(req: Request, res: Response) {
  try {
    const approved_users = await EventRegisterService.getAllApprovedByEventId(req.params.id as string);

    return res.status(200).json({
      status: "success",
      message: "Fetch register approved users successfully.",
      data: approved_users
    });
  } catch (err: any) {
     req.log.error({ err }, "EventRegisterController.getAllApprovedByEventId failed");
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getAllByUserId(req: any, res: Response) {
  try {
    const { items, total, offset, limit } = await EventRegisterService.getAllByUserId(req.user._id, req.query);

    return res.status(200).json({
      status: "success",
      message: "Fetch registered events successfully.",
      data: items,
      meta: pageMeta(total, offset, limit)
    });
  } catch (err: any) {
     req.log.error({ err }, "EventRegisterController.getAllByUserId failed");
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getAllApprovedByUserId(req: any, res: Response) {
  try {
    const { items, total, offset, limit } = await EventRegisterService.getAllApprovedByUserId(req.user._id, req.query);

    return res.status(200).json({
      status: "success",
      message: "Fetch registered events successfully.",
      data: items,
      meta: pageMeta(total, offset, limit)
    });
  } catch (err: any) {
     req.log.error({ err }, "EventRegisterController.getAllApprovedByUserId failed");
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function approveRegister(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const requested_user_ids = Array.isArray(req.body.user_id_list) ? req.body.user_id_list : [];
    const event = await EventService.getOneById(req.body.event_id);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "Event not found.",
      });
    }

    if (event.user._id.toString() !== req.user._id) {
      return res.status(403).json({
        status: "error",
        message: "You are not the organizer of this event.",
      });
    }

    const users = await UserService.findManyByIds(requested_user_ids);
    const usersById = new Map(users.map((user: any) => [user._id.toString(), user]));

    const pending = await EventRegisterService.getPendingByEventAndUsers(req.body.event_id, requested_user_ids);
    const approvedIds: string[] = pending.map((registration: any) => registration.user.toString());
    const approvedSet = new Set<string>(approvedIds);
    const skippedIds: string[] = requested_user_ids.filter((id: string) => !approvedSet.has(id));

    if (approvedIds.length > 0) {
      const register_approved = await EventRegisterService.approveRegister(approvedIds, req.body.event_id);

      if (!register_approved) {
        return res.status(500).json({
          status: "error",
          message: "Failed to approve registration.",
        });
      }

      await bestEffort("register_approved emails", async () => {
        await EmailService.sendBatch(approvedIds.map((id: string) => {
          const user: any = usersById.get(id);
          return {
            action: "register_approved",
            recipient: user.email,
            additional: { name: user.name, event_title: event.title },
          };
        }), { event: req.body.event_id });
      });

      await bestEffort("register_approved notifications", () => NotificationService.sendRegistrationApproved(approvedIds, event));
    }

    const summary = (ids: string[]) => ids.map((id: string) => {
      const user: any = usersById.get(id);
      return { _id: id, name: user?.name };
    });

    return res.status(200).json({
      status: "success",
      message: "Registrations processed.",
      data: {
        approved: summary(approvedIds),
        skipped: summary(skippedIds),
        email: { queued: approvedIds.length },
      },
    });
  } catch (err: any) {
    req.log.error({ err }, "EventRegisterController.approveRegister failed");
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function startMeeting(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const user_id_list = req.body.user_id_list;
    const event_id = req.body.event_id;
    const event = await EventService.getOneById(event_id);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID.",
      });
    }

    if (event.user._id.toString() !== req.user._id) {
      return res.status(403).json({
        status: "error",
        message: "You are not the organizer of this event.",
      });
    }

    const meeting_started = await EventRegisterService.startMeeting(user_id_list, event_id);

    if (!meeting_started) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send meeting email.",
      });
    }

    await bestEffort("meeting_started emails", async () => {
      const users = await UserService.findManyByIds(user_id_list);
      await EmailService.sendBatch(users.map((user: any) => ({
        action: "meeting_started",
        recipient: user.email,
        additional: { name: user.name, event_title: event.title },
      })), { event: event_id });
    });

    await bestEffort("meeting_started notifications", () => NotificationService.sendMeetingStarted(user_id_list, event));

    return res.status(200).json({
      status: "success",
      message: "Meeting email has been successfully sent.",
    });
  } catch (err: any) {
    req.log.error({ err }, "EventRegisterController.startMeeting failed");
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}
