-- حذف الجداول الحالية (DATETIME) وإعادة إنشائها بـ BIGINT + عمود تاريخ مقروء
-- نفّذ على قاعدة ocpp_CSGO

USE ocpp_CSGO;

-- حذف (الترتيب مهم بسبب الـ FK)
DROP TABLE IF EXISTS user_notification_read;
DROP TABLE IF EXISTS charger_notifications;

-- جدول الإشعارات: created_at = epoch ms، وعمود محسوب للتاريخ المقروء
CREATE TABLE charger_notifications (
  id          VARCHAR(64)   NOT NULL PRIMARY KEY COMMENT 'Example: n-{timestamp}-{random}',
  charger_id  VARCHAR(64)   NOT NULL COMMENT 'Linked to Chargers.charger_id',
  online      TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '1 = online, 0 = offline',
  message     VARCHAR(512)  DEFAULT NULL,
  level       VARCHAR(32)   DEFAULT 'info' COMMENT 'success | info | warning | error',
  created_at  BIGINT        NOT NULL COMMENT 'Epoch milliseconds (for ?since=)',
  created_at_readable DATETIME GENERATED ALWAYS AS (FROM_UNIXTIME(created_at/1000)) VIRTUAL COMMENT 'التاريخ والوقت بصيغة مقروءة',
  INDEX idx_charger_id (charger_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Charger status notifications (online/offline) from MQTT → API';

-- جدول تتبع القراءة: read_at = epoch ms، وعمود محسوب للتاريخ المقروء
CREATE TABLE user_notification_read (
  user_id         INT          NOT NULL COMMENT 'Linked to Users.user_id (PK)',
  notification_id VARCHAR(64)  NOT NULL COMMENT 'Linked to charger_notifications.id',
  read_at         BIGINT       NOT NULL COMMENT 'Read time (epoch ms)',
  read_at_readable DATETIME GENERATED ALWAYS AS (FROM_UNIXTIME(read_at/1000)) VIRTUAL COMMENT 'وقت القراءة بصيغة مقروءة',
  PRIMARY KEY (user_id, notification_id),
  INDEX idx_user_id (user_id),
  INDEX idx_notification_id (notification_id),
  CONSTRAINT fk_unr_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_unr_notification FOREIGN KEY (notification_id) REFERENCES charger_notifications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Track notification read status for each user.';
