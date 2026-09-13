"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import HeroBanner from "../components/HeroBanner";
import ProgramSection from "../components/ProgramSection";
import CoachSection from "../components/CoachSection";
import FacilitySection from "../components/FacilitySection";
import AchievementSection from "../components/AchievementSection";
import TestimonialSection from "../components/TestimonialSection";
import EventInfoSection from "../components/EventInfoSection";
import StatusCheckerSection from "../components/StatusCheckerSection";
import Footer from "../components/Footer";
import RegistrationModal from "../components/RegistrationModal";
import { getHomepageData } from "../lib/api";

export default function HomePage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [heroConfig, setHeroConfig] = useState<any>(null);
  const [heroStats, setHeroStats] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [programConfig, setProgramConfig] = useState<any>(null);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [coachConfig, setCoachConfig] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityConfig, setFacilityConfig] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementConfig, setAchievementConfig] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [testimonialConfig, setTestimonialConfig] = useState<any>(null);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const res = await getHomepageData();
      if (res && res.success && res.data) {
        if (res.data.banners) setBanners(res.data.banners);
        if (res.data.tournaments) setTournaments(res.data.tournaments);
        if (res.data.hero_config) setHeroConfig(res.data.hero_config);
        if (res.data.hero_stats) setHeroStats(res.data.hero_stats);
        if (res.data.events) setEvents(res.data.events);
        if (res.data.site_config) setSiteConfig(res.data.site_config);
        if (res.data.training_programs) setPrograms(res.data.training_programs);
        if (res.data.program_section_config) setProgramConfig(res.data.program_section_config);
        if (res.data.coaches) setCoaches(res.data.coaches);
        if (res.data.coach_section_config) setCoachConfig(res.data.coach_section_config);
        if (res.data.facilities) setFacilities(res.data.facilities);
        if (res.data.facility_section_config) setFacilityConfig(res.data.facility_section_config);
        if (res.data.achievements) setAchievements(res.data.achievements);
        if (res.data.achievement_section_config) setAchievementConfig(res.data.achievement_section_config);
        if (res.data.testimonials) setTestimonials(res.data.testimonials);
        if (res.data.testimonial_section_config) setTestimonialConfig(res.data.testimonial_section_config);
      }
    }
    loadData();
  }, []);

  const openRegisterModal = () => setIsRegisterModalOpen(true);
  const closeRegisterModal = () => setIsRegisterModalOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header siteConfig={siteConfig} onOpenRegisterModal={openRegisterModal} />
      <main>
        <HeroBanner
          banners={banners}
          heroConfig={heroConfig}
          heroStats={heroStats}
          onOpenRegisterModal={openRegisterModal}
        />
        <ProgramSection programs={programs} sectionConfig={programConfig} siteConfig={siteConfig} />
        <CoachSection coaches={coaches} sectionConfig={coachConfig} />
        <FacilitySection facilities={facilities} facilityConfig={facilityConfig} />
        <TestimonialSection testimonials={testimonials} sectionConfig={testimonialConfig} />
        <EventInfoSection events={events} tournaments={tournaments} onOpenRegisterModal={openRegisterModal} />
        <StatusCheckerSection />
      </main>
      <Footer siteConfig={siteConfig} programs={programs} />

      {/* Interactive 4-Step Popup Registration Modal */}
      <RegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={closeRegisterModal}
        events={events}
        tournaments={tournaments}
        siteConfig={siteConfig}
      />
    </div>
  );
}
