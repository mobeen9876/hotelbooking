import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import styles from "./Home.module.css";
import ChatWindow from "../components/ChatWindow";
import { supabase } from "../supabaseClient";
import { useChat } from "../context/ChatContext";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function Home({ isAdmin }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [lastBooking, setLastBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [chatOpen, setChatOpen] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const [userId, setUserId] = useState(null);

  const { hasAdminReply, markUserRead } = useChat();

  useEffect(() => {
    fetchBookedDates();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });

    // Real-time: when any user books a date, update the calendar for everyone
    const channel = supabase
      .channel("home-bookings-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          setBookedDates((prev) => [...prev, payload.new.date]);
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Home bookings channel issue:", status, err);
          fetchBookedDates();
        }
      });

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (chatOpen && userId) {
      markUserRead(userId);
    }
  }, [chatOpen, userId]);

  const fetchBookedDates = async () => {
    const { data, error } = await supabase.from("bookings").select("date");
    if (error) {
      console.error(error);
      return;
    }
    setBookedDates(data.map((b) => b.date));
  };

  const handleChatOpen = () => {
    if (!userId) {
      Swal.fire({
        icon: "warning",
        title: "Please Login First!",
        text: "You need to login to use chat.",
        confirmButtonColor: "#1C1C1E",
      });
      return;
    }
    setChatOpen((o) => !o);
  };

  const bookRoom = async () => {
    if (!selectedDate) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      Swal.fire({
        icon: "warning",
        title: "Please Login First!",
        text: "You need to login to book a room.",
        confirmButtonColor: "#1C1C1E",
      });
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      date: selectedDate,
      user_id: user.id,
      user_email: user.email,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        Swal.fire({
          icon: "warning",
          title: "Date Already Booked!",
          text: "This date is already taken. Please choose another date.",
          confirmButtonColor: "#1C1C1E",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Booking Failed",
          text: error.message,
          confirmButtonColor: "#1C1C1E",
        });
      }
      return;
    }

    setLastBooking(selectedDate);
    setSelectedDate(null);
    fetchBookedDates();
    Swal.fire({
      icon: "success",
      title: "Room Booked!",
      text: `Reserved for ${formatDate(selectedDate)}`,
      confirmButtonColor: "#1C1C1E",
    });
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const buildCalendar = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDay; i++) cells.push({ day: null, type: "empty" });

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(calYear, calMonth, d);
      const str = date.toISOString().split("T")[0];
      const isPast = date < today;
      const isBook = bookedDates.includes(str);
      const isSel = selectedDate === str;
      const isToday = date.toDateString() === today.toDateString();

      let type = "available";
      if (isPast) type = "past";
      if (isBook) type = "booked";
      if (isSel) type = "selected";
      if (isToday && !isSel) type = "today";

      cells.push({ day: d, str, type });
    }
    return cells;
  };

  const cells = buildCalendar();
  const showRedDot = userId && hasAdminReply(userId) && !chatOpen;

  return (
    <div className={styles.page}>
      <div className={styles.banner}>
        <div className={styles.tag}>✦ Premium Stay</div>
        <h1 className={styles.bannerTitle}>
          Book Your <em className={styles.bannerEm}>Perfect Room</em>
        </h1>
        <p className={styles.bannerSub}>
          Select a date and reserve your room in seconds.
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Select a Date</h2>
        <p className={styles.cardSub}>Pick your preferred check-in date</p>

        <div className={styles.calHead}>
          <button className={styles.navBtn} onClick={prevMonth}>
            ←
          </button>
          <span className={styles.monthLabel}>
            {MONTHS[calMonth]} {calYear}
          </span>
          <button className={styles.navBtn} onClick={nextMonth}>
            →
          </button>
        </div>

        <div className={styles.grid}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className={styles.dayLabel}>
              {d}
            </div>
          ))}
          {cells.map((c, i) => (
            <div
              key={i}
              className={`${styles.cell} ${styles[c.type]}`}
              onClick={() => {
                if (c.type === "available" || c.type === "today")
                  setSelectedDate(c.str);
              }}
            >
              {c.day}
            </div>
          ))}
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotAvailable}`} />{" "}
            Available
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotBooked}`} /> Booked
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotSelected}`} /> Selected
          </div>
        </div>

        {selectedDate && (
          <div className={styles.selectedBox}>
            Selected: <strong>{formatDate(selectedDate)}</strong>
          </div>
        )}

        <button
          className={
            selectedDate && !loading ? styles.bookBtn : styles.bookBtnOff
          }
          disabled={!selectedDate || loading}
          onClick={bookRoom}
        >
          {loading ? "Booking..." : "Book This Date"}
        </button>

        {lastBooking && (
          <div className={styles.success}>
            Booked: <strong>{formatDate(lastBooking)}</strong>
          </div>
        )}
      </div>

      {!isAdmin && (
        <button className={styles.fab} onClick={handleChatOpen}>
          💬
          {showRedDot && <span className={styles.fabDot} />}
        </button>
      )}

      {!isAdmin && chatOpen && userId && (
        <ChatWindow
          userId={userId}
          label="Chat with Admin"
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}

function formatDate(str) {
  return new Date(str + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default Home;
