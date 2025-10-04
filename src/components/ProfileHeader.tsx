import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderProps {
  title: string;
  subtitle: string;
  rightElement?: React.ReactNode;
  onProfilePress?: () => void;
  onRightElementPress?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title,
  subtitle,
  rightElement,
  onProfilePress,
  onRightElementPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <TouchableOpacity style={styles.profileContainer} onPress={onProfilePress}>
          <View style={styles.profileImage}>
            <Ionicons name="person" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.rightSection}>
        {rightElement ? (
          <TouchableOpacity style={styles.rightButton} onPress={onRightElementPress}>
            {rightElement}
          </TouchableOpacity>
        ) : (
          <View style={styles.dateContainer}>
            <TouchableOpacity style={styles.dateButton} onPress={onRightElementPress}>
              <Text style={styles.dateText}>&lt; {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} &gt;</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  leftSection: {
    flex: 1,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  profileText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  rightButton: {
    padding: 8,
  },
  dateContainer: {
    alignItems: 'center',
  },
  dateButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
});

export default ProfileHeader;
