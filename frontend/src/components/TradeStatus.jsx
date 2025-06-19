function TradeStatus({ status }) {
  if (!status) return null;

  return (
    <div
      className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-danger'}`}
    >
      {status.message}
    </div>
  );
}

export default TradeStatus;