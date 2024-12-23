import React, { useEffect, useState } from 'react';
import { List, Button, Popup, Form, Input, Toast, SwipeAction, Card, Dialog } from 'antd-mobile';
import { AddOutline, DeleteOutline } from 'antd-mobile-icons';
import { useChargingStore } from '../stores/chargingStore';
import type { MaintenanceRecord, MaintenanceItem } from '../types';
import dayjs from 'dayjs';
import './Maintenance.css';

const Maintenance: React.FC = () => {
  const { maintenanceRecords, addMaintenanceRecord, loadMaintenanceRecords, updateMaintenanceRecord, deleteMaintenanceRecord } = useChargingStore();
  const [form] = Form.useForm();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMaintenanceRecords();
  }, []);

  const addItem = () => {
    const newItem: MaintenanceItem = {
      id: Date.now().toString(),
      name: '',
      interval: 0,
      quantity: 1,
      price: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<MaintenanceItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        if ('quantity' in updates || 'price' in updates) {
          updatedItem.total = updatedItem.quantity * updatedItem.price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotalCost = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (values: Partial<MaintenanceRecord>) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const record = {
        ...values,
        items,
        totalCost: calculateTotalCost(),
        mileage: Number(values.mileage),
      };

      if (editingRecord) {
        await updateMaintenanceRecord(editingRecord.id, {
          ...record,
          id: editingRecord.id,
        });
      } else {
        await addMaintenanceRecord({
          ...record,
          id: Date.now().toString(),
          date: dayjs().format('YYYY-MM-DD'),
        } as MaintenanceRecord);
      }

      Toast.show({
        content: editingRecord ? '修改成功' : '新增成功',
        position: 'bottom',
      });
      
      setShowForm(false);
      setEditingRecord(null);
      setItems([]);
      form.resetFields();
      await loadMaintenanceRecords();
    } catch (error) {
      Toast.show({
        content: editingRecord ? '修改失敗' : '新增失敗',
        position: 'bottom',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showEditForm = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    if (record.items) {
      setItems(record.items);
    } else {
      setItems([]);
    }
    form.setFieldsValue(record);
    setShowForm(true);
  };

  const handleDelete = (record: MaintenanceRecord) => {
    Dialog.confirm({
      title: '確認刪除',
      content: '確定要刪除此維修記錄嗎？',
      onConfirm: async () => {
        try {
          await deleteMaintenanceRecord(record.id);
          await loadMaintenanceRecords();
          Toast.show({
            content: '刪除成功',
            position: 'bottom',
          });
        } catch (error) {
          Toast.show({
            content: '刪除失敗',
            position: 'bottom',
          });
        }
      },
    });
  };

  return (
    <div className="maintenance-page">
      <div className="records-header">
        <h1>維修記錄</h1>
        <Button
          color="primary"
          onClick={() => {
            setEditingRecord(null);
            setItems([]);
            form.resetFields();
            setShowForm(true);
          }}
        >
          新增記錄
        </Button>
      </div>
      
      <List>
        {maintenanceRecords.map(record => (
          <SwipeAction
            key={record.id}
            rightActions={[
              {
                key: 'edit',
                text: '修改',
                color: 'primary',
                onClick: () => showEditForm(record),
              },
              {
                key: 'delete',
                text: '刪除',
                color: 'danger',
                onClick: () => handleDelete(record),
              },
            ]}
          >
            <List.Item
              title={record.type}
              description={
                <div className="record-details">
                  <div className="record-row">
                    <span>日期：{record.date}</span>
                    <span>里程數：{record.mileage} km</span>
                  </div>
                  <div className="record-row">
                    <span>地點：{record.location}</span>
                    <span>費用：${record.totalCost}</span>
                  </div>
                  {record.note && (
                    <div className="record-row">
                      <span>備註：{record.note}</span>
                    </div>
                  )}
                </div>
              }
            />
          </SwipeAction>
        ))}
      </List>

      <Popup
        visible={showForm}
        onMaskClick={() => {
          setShowForm(false);
          setEditingRecord(null);
          setItems([]);
          form.resetFields();
        }}
        position="bottom"
        bodyStyle={{ height: '90vh' }}
      >
        <div className="form-container">
          <div className="form-header">
            <h3>{editingRecord ? '修改維修記錄' : '新增維修記錄'}</h3>
            <Button onClick={() => {
              setShowForm(false);
              setEditingRecord(null);
              setItems([]);
              form.resetFields();
            }}>
              關閉
            </Button>
          </div>
          
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            style={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}
          >
            <div style={{ padding: '0 16px 80px' }}>
              <Form.Header>基本資訊</Form.Header>
              <Form.Item name="type" label="維修類型" rules={[{ required: true }]}>
                <Input placeholder="請輸入維修類型" />
              </Form.Item>
              <Form.Item name="mileage" label="里程數" rules={[{ required: true }]}>
                <Input type="number" placeholder="請輸入里程數" />
              </Form.Item>
              <Form.Item name="location" label="維修地點" rules={[{ required: true }]}>
                <Input placeholder="請輸入維修地點" />
              </Form.Item>
              <Form.Item name="date" label="維修日期" rules={[{ required: true }]}>
                <Input 
                  type="date" 
                  placeholder="請選擇維修日期"
                  defaultValue={dayjs().format('YYYY-MM-DD')}
                />
              </Form.Item>

              <Form.Header>維修項目</Form.Header>
              <div className="maintenance-items">
                <div className="items-header">
                  <h4>維修項目列表</h4>
                  <Button
                    size='small'
                    onClick={addItem}
                  >
                    <AddOutline /> 新增項目
                  </Button>
                </div>
                
                {items.map(item => (
                  <Card key={item.id} className="item-card">
                    <div className="item-form">
                      <Form.Item label="項目名稱">
                        <Input
                          value={item.name}
                          onChange={val => updateItem(item.id, { name: val })}
                          placeholder="請輸入項目名稱"
                        />
                      </Form.Item>
                      <div className="item-numbers">
                        <Form.Item label="數量">
                          <Input
                            type="number"
                            value={item.quantity.toString()}
                            onChange={val => updateItem(item.id, { quantity: Number(val) })}
                          />
                        </Form.Item>
                        <Form.Item label="單價">
                          <Input
                            type="number"
                            value={item.price.toString()}
                            onChange={val => updateItem(item.id, { price: Number(val) })}
                          />
                        </Form.Item>
                      </div>
                      <div className="item-total">
                        小計: ${item.total}
                        <Button
                          fill='none'
                          color='danger'
                          onClick={() => removeItem(item.id)}
                        >
                          <DeleteOutline />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                
                <div className="total-cost">
                  總費用: ${calculateTotalCost()}
                </div>
              </div>
            </div>

            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              backgroundColor: 'var(--bg-primary)',
              borderTop: '1px solid var(--chart-grid)'
            }}>
              <Button
                block
                type="submit"
                color="primary"
                loading={isSubmitting}
              >
                儲存
              </Button>
            </div>
          </Form>
        </div>
      </Popup>
    </div>
  );
};

export default Maintenance;
