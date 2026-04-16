import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import StarRating from './StarRating';

interface ReviewOwnerReply {
  text: string;
  date: string;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string | null;
  rating: number;
  comment: string;
  date: string;
  ownerReply?: ReviewOwnerReply | null;
}

interface ReviewItemProps {
  review: Review;
}

export default function ReviewItem({ review }: ReviewItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {review.userAvatar ? (
          <Image source={{ uri: review.userAvatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={16} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{review.userName}</Text>
          <Text style={styles.date}>{review.date}</Text>
        </View>
      </View>

      <StarRating rating={review.rating} size={14} />

      <Text style={styles.comment}>{review.comment}</Text>

      {review.ownerReply && (
        <View style={styles.replyContainer}>
          <View style={styles.replyHeader}>
            <Ionicons name="arrow-undo" size={14} color={Colors.textSecondary} />
            <Text style={styles.replyLabel}>Respuesta del propietario</Text>
          </View>
          <Text style={styles.replyText}>{review.ownerReply.text}</Text>
          <Text style={styles.replyDate}>{review.ownerReply.date}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  date: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  replyContainer: {
    marginLeft: 16,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    gap: 4,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  replyText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text,
  },
  replyDate: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
