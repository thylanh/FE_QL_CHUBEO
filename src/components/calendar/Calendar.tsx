"use client";
import React, { useState, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";

import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { apiClient } from "@/lib/apiConfig";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
  };
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("Primary");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const calendarsEvents = {
    Danger: "Lịch hẹn",
    Success: "Công việc",
    Primary: "Công tác",
    Warning: "Xin nghỉ",
  };

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const fetchEvents = useCallback(async (from?: string, to?: string) => {
    try {
      setIsLoadingEvents(true);
      const now = new Date();
      const start = from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const end = to || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      const response = await apiClient.calendar.getCalendar(start, end);

      if (!response.success || !response.data) {
        throw new Error(response.error || "Không thể tải lịch làm.");
      }

      const mappedEvents = response.data.map((item) => ({
        id: String(item.id),
        title: item.title,
        start: item.start,
        end: item.end || undefined,
        allDay: item.allDay ?? true,
        extendedProps: {
          calendar: item.extendedProps?.calendar || item.calendar || "Primary",
        },
      }));

      setEvents(mappedEvents);
    } catch {
      setEvents([]);
      showToast("Không thể tải dữ liệu lịch làm.");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    void fetchEvents(from, to);
  }, [fetchEvents]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar || "Primary");
    openModal();
  };

  const handleAddOrUpdateEvent = async () => {
    if (!eventTitle.trim() || !eventStartDate) {
      showToast("Vui lòng nhập tên sự kiện và ngày bắt đầu.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: eventTitle.trim(),
      start: eventStartDate,
      end: eventEndDate || eventStartDate,
      allDay: true,
      calendar: eventLevel || "Primary",
    };

    try {
      const response = selectedEvent
        ? await apiClient.calendar.updateCalendarEvent(String(selectedEvent.id), payload)
        : await apiClient.calendar.createCalendarEvent(payload);

      if (!response.success) {
        throw new Error(response.error || "Không thể lưu lịch làm.");
      }

      const actionText = selectedEvent ? "cập nhật" : "thêm";
      showToast(`Đã ${actionText} lịch làm thành công.`);

      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      await fetchEvents(from, to);
      closeModal();
      resetModalFields();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể lưu lịch làm.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    setIsSubmitting(true);

    try {
      const response = await apiClient.calendar.deleteCalendarEvent(String(selectedEvent.id));
      if (!response.success) {
        throw new Error(response.error || "Không thể xoá lịch làm.");
      }

      showToast(`Đã xóa lịch làm "${selectedEvent.title}".`);

      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      await fetchEvents(from, to);
      closeModal();
      resetModalFields();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể xoá lịch làm.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("Primary");
    setSelectedEvent(null);
  };

  return (
    <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl transition-all animate-bounce dark:bg-amber-500 dark:text-gray-950">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="custom-calendar">
        {isLoadingEvents && (
          <div className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-600 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-300">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            Đang tải lịch làm...
          </div>
        )}

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          locale={viLocale}
          firstDay={1}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next addEventButton",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          customButtons={{
            addEventButton: {
              text: "Lịch làm +",
              click: openModal,
            },
          }}
        />
      </div>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-6 lg:p-10"
      >
        <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
          <div>
            <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
              {selectedEvent ? "Cập nhật lịch làm" : "Thêm lịch làm"}
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chú ý: Ca làm việc & sự kiện sẽ được hiển thị lên lịch
            </p>
          </div>
          <div className="mt-8">
            <div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Lý do / Tên sự kiện
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                Mục đích 
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                {Object.entries(calendarsEvents).map(([key, value]) => (
                  <div key={key} className="n-chk">
                    <div
                      className={`form-check form-check-${value} form-check-inline`}
                    >
                      <label
                        className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                        htmlFor={`modal${key}`}
                      >
                        <span className="relative">
                          <input
                            className="sr-only form-check-input"
                            type="radio"
                            name="event-level"
                            value={key}
                            id={`modal${key}`}
                            checked={eventLevel === key}
                            onChange={() => setEventLevel(key)}
                          />
                          <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                            <span
                              className={`h-2 w-2 rounded-full bg-white ${eventLevel === key ? "block" : "hidden"
                                }`}
                            ></span>
                          </span>
                        </span>
                        {value}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Bắt đầu từ ngày
              </label>
              <div className="relative">
                <input
                  id="event-start-date"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Kết thúc ngày
              </label>
              <div className="relative">
                <input
                  id="event-end-date"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
            {selectedEvent ? (
              <button
                onClick={handleDeleteEvent}
                type="button"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-700 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 sm:w-auto"
              >
                {isSubmitting && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                )}
                {isSubmitting ? "Đang xóa..." : "Xóa"}
              </button>
            ) : null}
            <button
              onClick={closeModal}
              type="button"
              disabled={isSubmitting}
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Đóng
            </button>
            <button
              onClick={handleAddOrUpdateEvent}
              type="button"
              disabled={isSubmitting}
              className="btn btn-success btn-update-event flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isSubmitting
                ? selectedEvent
                  ? "Đang cập nhật..."
                  : "Đang thêm..."
                : selectedEvent
                  ? "Cập nhật thay đổi"
                  : "Thêm sự kiện"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const calendarName = eventInfo.event.extendedProps.calendar || "Primary";
  const colorClass = `fc-bg-${String(calendarName).toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;
