import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRooms, createRoom, updateRoom, deleteRoom } from '@/services/roomService';
import { getMeetings } from '@/services/meetingService';
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Users,
  X,
  Tv,
  Video,
  FileText,
  Accessibility,
  Share2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Meeting, Room } from '@/types';

// Mock images to cycle through
const ROOM_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuALDyyGz3OiMNNgOSyHRKwPOoSlZcB8DAgqL5YHvtfA4dZF2QCPCYAg5W-6SDtpz3f8nGUymaiA66mIs5oXKC5hnwi-q5NK0fAflYeR8kiLJ2KoXb9zqsPBsAmGdNkhTcpTR_cBeLx0-1KvQxki8gTwLrt8EtlDWBV3mtfxqik2MvlWgQTYtuTKm26QdNLnQLN1svbUNSCE0Ey0wKgx-vM-hTzpJPH8Hm4mS8xJM55ibm3Mg5MJvrbe5s-wxGbXLRs_ii9VZkRLesw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAXaLfV5mH9_LxbdSWizPWZJRU5BUgaGGTftX8q7AI2ZyJ2lnftjNIjZvT35Cx_UIrhO7ht7KyQj0u-Ic7Tfmh73HeD5AoYcWYKRMRf5_a2-fqzrInewpgU2BsRi3f7Qe9mYReXAVS9cmsWySKVuaPJqWYNLW6NCmVmgPfXP5bQBZ2SlXSMjG561OVQyWcvoVCtUxPSdACfp_KTaGRyrj_lay1izsX03fGhPFkCCo9Ztr8FzrD1vYNjgxS9fOHCicjwMPQHhB8oZ_w",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuASK9KuaKpD5NH1nrjGEnhDnnE3uEvZBa40DWiGsPT5yNg-hgGa2nAGpSg1Dweor5ktHSUcckSelLFbndxV4lmsnMBFAmh6sCUdB7hZNnWSm_yzvzWpFdQOzK6TQ4Xar2D93gz7OolGv75bMbGKLtKh4e2AAKw2EWVHFgYNH_yGDVZ79ltHqaffvSfg0K-mRAlFjqvRXLmOI4BbbCvJZmgFLBiXdBT2g56lwcQ1uHLNzov3KFnUamus_gqAqkQF4kmkdrKZFi8SEms"
];

// Amenity filter keys must match the vocabulary rooms actually store in
// equipment (e.g. "VC setup", "Polycom", "Monitor", "screen"), mirroring the
// synonym mapping used for the badges rendered on the cards.
const AMENITY_SYNONYMS: Record<string, RegExp> = {
  display: /display|tv|screen|monitor|projector/i,
  video: /video|polycom|camera|\bvc\b|zoom/i,
  whiteboard: /whiteboard|board/i,
  accessible: /accessible|wheelchair|ada/i,
};

export default function Rooms() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [capacityFilters, setCapacityFilters] = useState<string[]>(['conference']); // default checking 5-10 conference
  const [selectedFloor, setSelectedFloor] = useState('All Floors');
  const [requiredAmenities, setRequiredAmenities] = useState<string[]>([]);
  const [instantBookable, setInstantBookable] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadRooms();
    getMeetings().then(setMeetings).catch(console.error);
  }, []);

  async function loadRooms() {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this room?')) return;
    await deleteRoom(id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  function openCreate() {
    setEditingRoom(null);
    setSaveError('');
    setShowModal(true);
  }

  function openEdit(room: Room) {
    setEditingRoom(room);
    setSaveError('');
    setShowModal(true);
  }

  async function handleSave(data: Omit<Room, 'id' | 'createdAt'>) {
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, data);
      } else {
        await createRoom(data);
      }
      setShowModal(false);
      // Active filters (name search, capacity range, floor, amenities) can
      // silently hide the room that was just created/updated. Clear them so
      // the inventory list always reflects the saved room.
      setSearchQuery('');
      setCapacityFilters([]);
      setSelectedFloor('All Floors');
      setRequiredAmenities([]);
      setInstantBookable(false);
      setLoading(true);
      await loadRooms();
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save room. Please try again.');
    }
  }

  const handleCapacityToggle = (capRange: string) => {
    setCapacityFilters(prev => 
      prev.includes(capRange) ? prev.filter(c => c !== capRange) : [...prev, capRange]
    );
  };

  const handleAmenityToggle = (amenity: string) => {
    setRequiredAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  // A room is "instant bookable" when it is free for the next hour — i.e. no
  // pending/approved meeting overlaps the window [now, now + 1h]. Previously
  // the toggle was a decorative control (never referenced in the filter
  // predicate), so switching it had no visible effect on the card list.
  const busyRoomIds = useMemo(() => {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const set = new Set<string>();
    for (const m of meetings) {
      if (m.status === 'cancelled' || m.status === 'declined') continue;
      // Overlap: meeting starts before window-end AND ends after window-start
      if (m.startTime < inOneHour && m.endTime > now) {
        set.add(m.roomId);
      }
    }
    return set;
  }, [meetings]);

  // Filter items logic
  const filteredRooms = rooms.filter(room => {
    // 0. Instant Bookable: when enabled, hide rooms currently occupied
    if (instantBookable && busyRoomIds.has(room.id)) return false;

    // 1. Name search
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Capacity Ranges
    let matchesCapacity = capacityFilters.length === 0;
    if (capacityFilters.length > 0) {
      matchesCapacity = capacityFilters.some(filter => {
        if (filter === 'huddle') return room.capacity <= 4;
        if (filter === 'conference') return room.capacity > 4 && room.capacity <= 10;
        if (filter === 'boardroom') return room.capacity > 10;
        return false;
      });
    }

    // 3. Location Floor ("Floor 4" must match "floor 4", "4th floor", "flr 4")
    let matchesFloor = selectedFloor === 'All Floors';
    if (selectedFloor !== 'All Floors') {
      const floorNum = selectedFloor.replace(/\D/g, ''); // Extract digits
      const loc = room.location?.toLowerCase() || '';
      const pattern = new RegExp(`(floor|flr)\\s*${floorNum}\\b|\\b${floorNum}(st|nd|rd|th)\\s*floor`);
      matchesFloor = pattern.test(loc);
    }

    // 4. Required Amenities (synonym-aware, see AMENITY_SYNONYMS)
    const matchesAmenities = requiredAmenities.every(amenity => {
      const pattern = AMENITY_SYNONYMS[amenity];
      const equipmentList = room.equipment || [];
      if (pattern) return equipmentList.some(eq => pattern.test(eq));
      return equipmentList.some(eq => eq.toLowerCase().includes(amenity.toLowerCase()));
    });

    return matchesSearch && matchesCapacity && matchesFloor && matchesAmenities;
  });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
        Loading rooms...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h2 className="font-headline-lg text-on-surface mb-1">Rooms Management</h2>
          <p className="font-body-sm text-on-surface-variant">
            Manage inventory, schedules, and amenities for {rooms.length} spaces.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary flex items-center gap-2" style={{ fontSize: '0.8125rem' }}>
            <Share2 size={14} /> Export
          </button>
          {isAdmin && (
            <button className="btn btn-primary flex items-center gap-2" onClick={openCreate} style={{ fontSize: '0.8125rem' }}>
              <Plus size={14} /> Add Room
            </button>
          )}
        </div>
      </div>

      {/* Save Error Alert */}
      {saveError && (
        <div
          style={{
            marginBottom: 24,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-error-container)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-on-error-container)',
            fontSize: '0.8125rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{saveError}</span>
          <button
            onClick={() => setSaveError('')}
            className="btn btn-ghost btn-sm"
            style={{ padding: 2, color: 'var(--color-on-error-container)' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Layout: Sidebar filters + Grid */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        
        {/* Left Filters Sidebar */}
        <aside style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 88, textAlign: 'left' }}>
          
          {/* Find by Name */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Find by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: 12, paddingRight: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          
          <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

          {/* Availability Status Toggle */}
          <div>
            <h3 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-outline)', marginBottom: 12 }}>Availability</h3>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span className="font-body-sm" style={{ color: 'var(--color-on-surface)' }}>Instant Bookable</span>
              <div 
                onClick={() => setInstantBookable(!instantBookable)}
                style={{ 
                  position: 'relative', 
                  width: 40, 
                  height: 20, 
                  background: instantBookable ? 'var(--meetops-purple)' : 'var(--color-surface-container-highest)', 
                  borderRadius: '9999px',
                  transition: 'background-color 0.2s',
                }}
              >
                <span 
                  style={{ 
                    position: 'absolute', 
                    left: 2, 
                    top: 2, 
                    background: 'var(--color-surface)', 
                    width: 16, 
                    height: 16, 
                    borderRadius: '50%', 
                    transform: instantBookable ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.2s',
                  }} 
                />
              </div>
            </label>
          </div>

          <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

          {/* Capacity Filters */}
          <div>
            <h3 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-outline)', marginBottom: 12 }}>Capacity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={capacityFilters.includes('huddle')}
                  onChange={() => handleCapacityToggle('huddle')}
                  style={{ accentColor: 'var(--meetops-purple)' }}
                />
                <span className="font-body-sm" style={{ color: 'var(--color-on-surface-variant)' }}>1 - 4 People (Huddle)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={capacityFilters.includes('conference')}
                  onChange={() => handleCapacityToggle('conference')}
                  style={{ accentColor: 'var(--meetops-purple)' }}
                />
                <span className="font-body-sm" style={{ color: 'var(--color-on-surface-variant)' }}>5 - 10 People (Conf)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={capacityFilters.includes('boardroom')}
                  onChange={() => handleCapacityToggle('boardroom')}
                  style={{ accentColor: 'var(--meetops-purple)' }}
                />
                <span className="font-body-sm" style={{ color: 'var(--color-on-surface-variant)' }}>11+ People (Boardroom)</span>
              </label>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

          {/* Location floor dropdown */}
          <div>
            <h3 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-outline)', marginBottom: 12 }}>Location</h3>
            <select
              value={selectedFloor}
              onChange={e => setSelectedFloor(e.target.value)}
              className="input"
              style={{
                width: '100%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-on-surface)',
                cursor: 'pointer',
              }}
            >
              <option>All Floors</option>
              <option>Floor 4</option>
              <option>Floor 12</option>
              <option>Floor 14</option>
              <option>Floor 15</option>
            </select>
          </div>

          <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

          {/* Required Amenities */}
          <div>
            <h3 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-outline)', marginBottom: 12 }}>Required Amenities</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { key: 'display', icon: Tv, label: 'Display' },
                { key: 'video', icon: Video, label: 'Video Conf' },
                { key: 'whiteboard', icon: FileText, label: 'Whiteboard' },
                { key: 'accessible', icon: Accessibility, label: 'Accessible' },
              ].map(amenity => {
                const isActive = requiredAmenities.includes(amenity.key);
                return (
                  <button
                    key={amenity.key}
                    onClick={() => handleAmenityToggle(amenity.key)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: 8,
                      borderRadius: '8px',
                      border: isActive ? '1px solid var(--meetops-purple)' : '1px solid var(--color-border-subtle)',
                      background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'var(--color-surface-container-low)',
                      color: isActive ? 'var(--meetops-purple)' : 'var(--color-on-surface-variant)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <amenity.icon size={16} />
                    <span style={{ fontSize: '9px', fontWeight: 600 }}>{amenity.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Room Cards Grid */}
        <div style={{ flex: 1 }}>
          {filteredRooms.length === 0 ? (
            <div className="bento-card" style={{ padding: 60, textAlign: 'center' }}>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1rem', marginBottom: 16 }}>
                No rooms match the selected filters.
              </p>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setCapacityFilters([]);
                  setSelectedFloor('All Floors');
                  setRequiredAmenities([]);
                  setInstantBookable(false);
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20,
              }}
            >
              {filteredRooms.map((room, idx) => {
                // Cycle through mock cover images
                const coverImage = ROOM_IMAGES[idx % ROOM_IMAGES.length];
                
                // Real availability: room is free when it has no active
                // booking overlapping the next hour (same logic the
                // Instant Bookable filter uses).
                const isAvailable = !busyRoomIds.has(room.id);

                return (
                  <div
                    key={room.id}
                    className="bento-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {/* Image Cover */}
                    <div style={{ height: 160, position: 'relative', overflow: 'hidden', background: 'var(--color-surface-container-high)' }}>
                      <img
                        src={coverImage}
                        alt={room.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      
                      {/* Availability glass badge */}
                      <div style={{ position: 'absolute', top: 12, left: 12 }}>
                        <div style={{ background: 'rgba(11, 12, 14, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-full)', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isAvailable ? '#10B981' : '#EF4444', display: 'inline-block' }} />
                          <span className="font-label-caps" style={{ fontSize: '9px', color: 'white', letterSpacing: '0.05em' }}>
                            {isAvailable ? 'AVAILABLE' : 'IN USE'}
                          </span>
                        </div>
                      </div>

                      {/* Capacity badge */}
                      <div style={{ position: 'absolute', top: 12, right: 12 }}>
                        <div style={{ background: 'rgba(11, 12, 14, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-full)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} color="var(--color-on-surface-variant)" />
                          <span className="font-label-caps" style={{ fontSize: '9px', color: 'white' }}>{room.capacity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content info */}
                    <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>
                          {room.name}
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {room.location || 'N/A'}
                        </p>
                      </div>

                      {/* Equipment badge icons list */}
                      {room.equipment && room.equipment.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {room.equipment.map((eq, i) => {
                            let icon = null;
                            if (eq.toLowerCase().includes('display') || eq.toLowerCase().includes('tv') || eq.toLowerCase().includes('screen')) icon = <Tv size={12} />;
                            else if (eq.toLowerCase().includes('video') || eq.toLowerCase().includes('polycom') || eq.toLowerCase().includes('camera')) icon = <Video size={12} />;
                            else icon = <FileText size={12} />;
                            
                            return (
                              <span
                                key={i}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: '0.6875rem',
                                  background: 'var(--color-surface)',
                                  border: '1px solid var(--color-border-subtle)',
                                  color: 'var(--color-on-surface-variant)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                                title={eq}
                              >
                                {icon} {eq}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Today's Usage Mini-Graph mockup */}
                      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--color-border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 6 }}>
                          <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-outline)' }}>TODAY'S USAGE</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface)' }}>{isAvailable ? '40%' : '80%'} booked</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 28 }}>
                          <div style={{ flex: 1, background: 'var(--color-surface-container-highest)', height: '20%', borderRadius: '2px 2px 0 0' }} />
                          <div style={{ flex: 1, background: 'var(--color-surface-container-highest)', height: '40%', borderRadius: '2px 2px 0 0' }} />
                          <div style={{ flex: 1, background: 'var(--meetops-purple)', height: isAvailable ? '30%' : '90%', opacity: 0.8, borderRadius: '2px 2px 0 0' }} />
                          <div style={{ flex: 1, background: 'var(--meetops-purple)', height: isAvailable ? '60%' : '100%', opacity: 0.9, borderRadius: '2px 2px 0 0' }} />
                          <div style={{ flex: 1, background: 'var(--color-surface-container-highest)', height: '10%', borderRadius: '2px 2px 0 0' }} />
                          <div style={{ flex: 1, background: 'var(--color-surface-container-highest)', height: '0%', borderRadius: '2px 2px 0 0' }} />
                        </div>
                      </div>

                      {/* Card Action Buttons (Always Visible for accessible clicks & clean control) */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <Link
                          to={`/meetings/new?roomId=${room.id}&roomName=${encodeURIComponent(room.name)}`}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, borderRadius: 'var(--radius-md)' }}
                        >
                          Book Room
                        </Link>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(room)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: 8, color: 'var(--color-on-surface-variant)' }}
                              title="Edit Room"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(room.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: 8, color: 'var(--color-error)' }}
                              title="Delete Room"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <RoomFormModal
          room={editingRoom}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          userId={profile?.uid || ''}
        />
      )}
    </div>
  );
}

function RoomFormModal({
  room,
  onClose,
  onSave,
  userId,
}: {
  room: Room | null;
  onClose: () => void;
  onSave: (data: Omit<Room, 'id' | 'createdAt'>) => Promise<void>;
  userId: string;
}) {
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [location, setLocation] = useState(room?.location || '');
  const [capacity, setCapacity] = useState(room?.capacity?.toString() || '10');
  const [equipmentInput, setEquipmentInput] = useState(room?.equipment?.join(', ') || '');
  const [availStart, setAvailStart] = useState(room?.availabilityStart || '09:00');
  const [availEnd, setAvailEnd] = useState(room?.availabilityEnd || '17:00');
  const [rules, setRules] = useState(room?.rules || '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const equipment = equipmentInput.split(',')
      .map(e => e.trim())
      .filter(Boolean);

    await onSave({
      name,
      description,
      location,
      capacity: parseInt(capacity) || 1,
      equipment,
      availabilityStart: availStart,
      availabilityEnd: availEnd,
      availableDays: [1, 2, 3, 4, 5],
      rules,
      createdBy: userId,
    });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          padding: 32, 
          maxWidth: 520, 
          borderRadius: '20px', 
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-ambient)',
          background: 'var(--color-surface-container-low)',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 className="font-headline-lg-mobile" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>
            {room ? 'Edit Room' : 'Create Room'}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Room Name *</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apollo Boardroom"
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this meeting room"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Location</label>
                <input
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Floor 14, HQ"
                />
              </div>
              <div>
                <label className="label">Capacity</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Equipment (comma separated)</label>
              <input
                className="input"
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                placeholder="Tv Display, Video Conf, Whiteboard"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Available From</label>
                <input className="input" type="time" value={availStart} onChange={(e) => setAvailStart(e.target.value)} />
              </div>
              <div>
                <label className="label">Available Until</label>
                <input className="input" type="time" value={availEnd} onChange={(e) => setAvailEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Usage Rules</label>
              <textarea
                className="input"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="e.g., Max 2 hours per booking"
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} id="save-room-btn">
              {saving ? 'Saving...' : room ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
