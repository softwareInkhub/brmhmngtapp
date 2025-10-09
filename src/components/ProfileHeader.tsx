import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface ProfileHeaderProps {
  title?: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onProfilePress?: () => void;
  onRightElementPress?: () => void;
  notificationsCount?: number;
  onNotificationsPress?: () => void;
  onMenuPress?: () => void;
}

const { width } = Dimensions.get('window');

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title,
  subtitle,
  rightElement,
  onProfilePress,
  onRightElementPress,
  notificationsCount = 0,
  onNotificationsPress,
  onMenuPress,
}) => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  // Use auth user data if available, otherwise use props
  const displayTitle = title || user?.name || 'Guest User';
  const displaySubtitle = subtitle || user?.email || 'Welcome back';

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowMenu(false),
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setShowMenu(false);
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      setShowMenu(true);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Left: Hamburger Menu */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <View style={styles.hamburgerContainer}>
            <Ionicons name="menu" size={26} color="#1f2937" />
          </View>
        </TouchableOpacity>

        {/* Center: Title */}
        <View style={styles.centerContainer}>
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.subtitle}>{displaySubtitle}</Text>
        </View>
        
        <View style={styles.rightSection}>
          {/* Notification Bell with badge */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationsPress}
            activeOpacity={0.7}
          >
            <View style={styles.notificationContainer}>
              <Ionicons name="notifications-outline" size={22} color="#1f2937" />
              {notificationsCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{notificationsCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Profile Icon */}
          <TouchableOpacity style={styles.profileButton} onPress={() => setShowMenu(true)}>
            <Ionicons name="person" size={20} color="#137fec" />
          </TouchableOpacity>

          {/* Optional right action (e.g., + Add) */}
          {rightElement ? (
            <TouchableOpacity style={styles.rightButton} onPress={onRightElementPress}>
              {rightElement}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Profile Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <View style={styles.menuProfileImage}>
                <Ionicons name="person" size={32} color="#137fec" />
              </View>
              <Text style={styles.menuTitle}>{displayTitle}</Text>
              <Text style={styles.menuSubtitle}>{displaySubtitle}</Text>
              {user?.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                </View>
              )}
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                // Add profile navigation here if needed
              }}
            >
              <Ionicons name="person-circle-outline" size={22} color="#6b7280" />
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                // Add settings navigation here if needed
              }}
            >
              <Ionicons name="settings-outline" size={22} color="#6b7280" />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={[styles.menuItem, styles.logoutMenuItem]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconButton: {
    padding: 8,
  },
  hamburgerContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  centerContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  rightSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  rightButton: {
    padding: 8,
  },
  notificationButton: {
    padding: 0,
  },
  notificationContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dbeafe',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  menuContainer: {
    width: width * 0.7,
    maxWidth: 300,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuProfileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#dbeafe',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#137fec',
    letterSpacing: 0.5,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutMenuItem: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});

export default ProfileHeader;

