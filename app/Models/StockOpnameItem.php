<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockOpnameItem extends Model
{
    protected $fillable = [
        'stock_opname_id',
        'stockable_type',
        'stockable_id',
        'stockable_name',
        'unit',
        'system_stock',
        'counted_stock',
        'difference',
        'note',
    ];

    public function stockOpname(): BelongsTo
    {
        return $this->belongsTo(StockOpname::class);
    }

    public function stockable(): MorphTo
    {
        return $this->morphTo();
    }

    protected function casts(): array
    {
        return [
            'system_stock' => 'decimal:3',
            'counted_stock' => 'decimal:3',
            'difference' => 'decimal:3',
        ];
    }
}
