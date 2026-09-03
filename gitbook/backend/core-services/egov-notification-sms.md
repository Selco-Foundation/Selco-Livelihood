# eGov Notification SMS

`backend/core-services/egov-notification-sms`

## What it does

A Kafka consumer, not a REST service — it has no callable API layer. It reads SMS notification messages off the `kafka.topics.notification.sms.name` topic and hands them off to a third-party SMS gateway. Any service that needs to send an SMS (`im-services`, `field-planner-activity`, `amc-scheduler-service`) publishes directly onto this shared topic itself; see [Architecture → Notifications](../../overview/architecture.md#notifications).

## Where to look

- `backend/core-services/egov-notification-sms/README.md`
